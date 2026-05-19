import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import AppLayout from "@/components/layout/AppLayout";
import { BadgeCheck, Clock, XCircle, Upload, Image } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const COUNTRIES_AR = [
  "سوريا","تركيا","السعودية","الإمارات","العراق","مصر","الأردن","الكويت",
  "قطر","البحرين","عُمان","لبنان","اليمن","فلسطين","ليبيا","تونس",
  "الجزائر","المغرب","السودان","الولايات المتحدة","ألمانيا","غيرها",
];
const COUNTRIES_EN = [
  "Syria","Turkey","Saudi Arabia","UAE","Iraq","Egypt","Jordan","Kuwait",
  "Qatar","Bahrain","Oman","Lebanon","Yemen","Palestine","Libya","Tunisia",
  "Algeria","Morocco","Sudan","United States","Germany","Other",
];

interface KycStatus {
  status: "none" | "pending" | "approved" | "rejected";
  adminNote?: string;
  fullName?: string;
}

function FileUploadField({
  label, name, preview, onFile, tapLabel,
}: {
  label: string; name: string; preview: string | null; onFile: (f: File | null) => void; tapLabel: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className="border-2 border-dashed border-primary/30 rounded-xl p-4 cursor-pointer hover:border-primary/60 transition-colors text-center flex flex-col items-center justify-center gap-2 min-h-[110px] bg-background/40"
      >
        {preview ? (
          <img src={preview} alt={label} className="max-h-24 rounded-lg object-contain" />
        ) : (
          <>
            <Image className="w-8 h-8 text-primary/50" />
            <span className="text-xs text-muted-foreground">{tapLabel}</span>
          </>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={e => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

export default function KycPage() {
  const { user, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, lang } = useI18n();
  const isRtlLang = ['ar', 'fa', 'ku'].includes(lang);

  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) { setLocation("/sign-in"); return; }
    fetchStatus();
  }, [isLoaded, user]);

  async function fetchStatus() {
    try {
      const res = await fetch(`${API_BASE}/api/identity`, { credentials: "include" });
      const data = await res.json();
      setKycStatus(data);
    } catch {
      setKycStatus({ status: "none" });
    } finally {
      setLoading(false);
    }
  }

  function compressImage(file: File, maxPx = 1200, quality = 0.75): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          let { width, height } = img;
          if (width > maxPx || height > maxPx) {
            if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
            else { width = Math.round((width * maxPx) / height); height = maxPx; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
            else resolve(file);
          }, "image/jpeg", quality);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFile(
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) {
    if (!file) { setFile(null); setPreview(null); return; }
    const compressed = await compressImage(file);
    setFile(compressed);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(compressed);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !idNumber) {
      toast({ variant: "destructive", title: t('kyc.requiredMsg') });
      return;
    }
    if (!idFrontFile || !idBackFile || !selfieFile) {
      toast({ variant: "destructive", title: t('kyc.photosRequiredMsg'), description: t('kyc.photosRequiredDesc') });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("idNumber", idNumber);
      if (country) formData.append("country", country);
      if (province) formData.append("province", province);
      if (extraInfo) formData.append("extraInfo", extraInfo);
      if (idFrontFile) formData.append("idPhotoFront", idFrontFile);
      if (idBackFile) formData.append("idPhotoBack", idBackFile);
      if (selfieFile) formData.append("selfie", selfieFile);

      const res = await fetch(`${API_BASE}/api/identity`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? t('kyc.errorTitle'));
      toast({ title: t('kyc.successTitle'), description: t('kyc.successDesc') });
      await fetchStatus();
    } catch (err: any) {
      toast({ variant: "destructive", title: t('kyc.errorTitle'), description: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = kycStatus?.status === "none" || kycStatus?.status === "rejected";
  const countries = isRtlLang ? COUNTRIES_AR : COUNTRIES_EN;

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <BadgeCheck className="w-6 h-6 text-blue-400" />
          {t('kyc.title')}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {t('kyc.subtitle')}
        </p>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && kycStatus?.status === "pending" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <Clock className="w-12 h-12 text-yellow-400" />
            <h2 className="text-lg font-semibold text-yellow-300">{t('kyc.pendingTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('kyc.pendingSub')}</p>
          </div>
        )}

        {!loading && kycStatus?.status === "approved" && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <BadgeCheck className="w-14 h-14 text-blue-400" />
            <h2 className="text-xl font-bold text-blue-300">{t('kyc.approvedTitle')}</h2>
            <p className="text-muted-foreground text-sm">{t('kyc.approvedSub')}</p>
          </div>
        )}

        {!loading && kycStatus?.status === "rejected" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-semibold text-sm">{t('kyc.rejectedTitle')}</p>
              {kycStatus.adminNote && (
                <p className="text-muted-foreground text-sm mt-1">{t('kyc.rejectedReason')} {kycStatus.adminNote}</p>
              )}
              <p className="text-muted-foreground text-xs mt-2">{t('kyc.rejectedSub')}</p>
            </div>
          </div>
        )}

        {!loading && showForm && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('kyc.fullName')} <span className="text-destructive">*</span></label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t('kyc.fullNamePh')}
                className="bg-background/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('kyc.idNumber')} <span className="text-destructive">*</span></label>
              <Input
                value={idNumber}
                onChange={e => setIdNumber(e.target.value)}
                placeholder={t('kyc.idNumberPh')}
                className="bg-background/50"
                dir="ltr"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('kyc.country')}</label>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">{t('kyc.countryPh')}</option>
                  {countries.map((c, i) => <option key={i} value={COUNTRIES_AR[i]}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('kyc.province')}</label>
                <Input
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  placeholder={t('kyc.provincePh')}
                  className="bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('kyc.extra')}</label>
              <Textarea
                value={extraInfo}
                onChange={e => setExtraInfo(e.target.value)}
                placeholder={t('kyc.extraPh')}
                className="bg-background/50 resize-none"
                rows={2}
              />
            </div>

            <div className="border-t border-border/40 pt-4">
              <p className="text-sm text-muted-foreground mb-4">{t('kyc.photosRequired')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FileUploadField
                  label={t('kyc.idFront')}
                  name="idPhotoFront"
                  preview={idFrontPreview}
                  tapLabel={t('kyc.tapToChoose')}
                  onFile={f => handleFile(f, setIdFrontFile, setIdFrontPreview)}
                />
                <FileUploadField
                  label={t('kyc.idBack')}
                  name="idPhotoBack"
                  preview={idBackPreview}
                  tapLabel={t('kyc.tapToChoose')}
                  onFile={f => handleFile(f, setIdBackFile, setIdBackPreview)}
                />
                <FileUploadField
                  label={t('kyc.selfie')}
                  name="selfie"
                  preview={selfiePreview}
                  tapLabel={t('kyc.tapToChoose')}
                  onFile={f => handleFile(f, setSelfieFile, setSelfiePreview)}
                />
              </div>
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              <Upload className="w-4 h-4 ml-2" />
              {submitting ? t('kyc.submitting') : t('kyc.submit')}
            </Button>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
