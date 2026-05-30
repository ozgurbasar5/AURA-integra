export type ServisWhatsappInput = {
  customer: string;
  device: string;
  tracking_code?: string;
  status: string;
  issue?: string;
  price?: string | number;
  serial_no?: string;
  notes?: string;
  partsLine?: string;
  upsellsLine?: string;
  warrantyLine?: string;
};

/** Atölye listesi + servis kartı için ortak WhatsApp metni (duruma göre) */
export function buildServisWhatsappMessage(i: ServisWhatsappInput): string {
  const name = (i.customer || "Müşteri").trim();
  const device = (i.device || "Cihaz").trim();
  const code = (i.tracking_code || "-").trim();
  const st = (i.status || "Bekliyor").trim();
  const price =
    i.price != null && String(i.price).trim() !== ""
      ? `${Number(i.price).toLocaleString("tr-TR")} TL`
      : "Henüz netleşmedi";

  const issueTrim = (i.issue || "").trim();
  const issueBlock = issueTrim
    ? `\n${String.fromCodePoint(0x1F4CB)} *Bildirilen sorun:*\n_${issueTrim}_\n`
    : "";

  const intro =
    `Sayın *${name}*,\n\n` +
    `Aura Bilişim Teknik Servis kaydınız güncellendi.\n\n` +
    `${String.fromCodePoint(0x1F4E6)} *Cihaz:* ${device}\n` +
    `${String.fromCodePoint(0x1F4C4)} *Takip no:* ${code}\n` +
    (i.serial_no ? `${String.fromCodePoint(0x1F522)} *Seri / IMEI:* ${i.serial_no}\n` : "") +
    `${String.fromCodePoint(0x1F4CA)} *Güncel durum:* *${st}*\n` +
    `${String.fromCodePoint(0x1F4B0)} *Tutar bilgisi:* ${price}\n` +
    issueBlock;

  let body = "";

  switch (st) {
    case "Teslim Edildi":
      body =
        `Cihazınızın servis süreci *tamamlanmış* ve teslimata hazırdır / teslim edilmiştir.\n\n` +
        (i.partsLine ? `${String.fromCodePoint(0x1F527)} *Parça / işlem:*\n${i.partsLine}\n\n` : "") +
        (i.upsellsLine ? `${String.fromCodePoint(0x2728)} *Ek hizmetler:*\n${i.upsellsLine}\n\n` : "") +
        (i.notes ? `${String.fromCodePoint(0x1F4DD)} *Servis notu:*\n${i.notes}\n\n` : "") +
        (i.warrantyLine ? `${i.warrantyLine}\n\n` : "") +
        `Cihazınızı servisimizden teslim alabilir veya durum hakkında bize yazabilirsiniz.\n`;
      break;
    case "Hazır":
      body =
        `Onarım / kontroller tamamlandı; cihazınız *teslime hazır* durumdadır.\n\n` +
        (i.notes ? `${String.fromCodePoint(0x1F4DD)} *Not:* ${i.notes}\n\n` : "") +
        `Teslim için uygun olduğunuzda bize haber verebilirsiniz.\n`;
      break;
    case "İşlemde":
      body =
        `Cihazınız şu an *tamirhanede işlem görüyor* (onarım aşamasında).\n\n` +
        `İlerleme oldukça bilgilendirmeye devam edeceğiz.\n`;
      break;
    case "Parça Bekliyor":
      body =
        `Cihazınız için gerekli *parça / malzeme beklenmektedir*.\n\n` +
        `Parça geldiğinde sürece hızla devam edilecektir.\n`;
      break;
    case "Onay Bekliyor":
      body =
        `İşlem için *ek onay / fiyat onayı* gerekmektedir.\n\n` +
        `Lütfen servisimizle iletişime geçerek onayınızı iletin.\n`;
      break;
    case "Bekliyor":
    default:
      body =
        `Cihazınız *kabul edildi* ve servis sırasına alındı.\n\n` +
        `İşleme başlandığında veya ek bilgi gerektiğinde yine buradan haber vereceğiz.\n`;
      break;
  }

  const footer =
    `\n${String.fromCodePoint(0x1F4CD)} *Aura Bilişim Teknik Servis*\n` +
    `Bu mesaj otomatik oluşturulmuştur; yanıt vermek için bu sohbeti kullanabilirsiniz.`;

  return (intro + body + footer).trim();
}
