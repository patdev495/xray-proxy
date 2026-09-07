export interface VietQrBank {
  code: string;
  shortName: string;
  name: string;
}

export const VIETQR_BANKS: VietQrBank[] = [
  { code: 'MB', shortName: 'MBBank', name: 'Ngân hàng Quân Đội' },
  { code: 'VCB', shortName: 'Vietcombank', name: 'Ngoại thương Việt Nam' },
  { code: 'TCB', shortName: 'Techcombank', name: 'Kỹ thương Việt Nam' },
  { code: 'ACB', shortName: 'ACB', name: 'Ngân hàng Á Châu' },
  { code: 'VPB', shortName: 'VPBank', name: 'Việt Nam Thịnh Vượng' },
  { code: 'TPB', shortName: 'TPBank', name: 'Tiên Phong' },
  { code: 'BIDV', shortName: 'BIDV', name: 'Đầu tư và Phát triển Việt Nam' },
  { code: 'ICB', shortName: 'VietinBank', name: 'Công thương Việt Nam' },
  { code: 'VIB', shortName: 'VIB', name: 'Quốc tế Việt Nam' },
  { code: 'STB', shortName: 'Sacombank', name: 'Sài Gòn Thương Tín' },
  { code: 'HDB', shortName: 'HDBank', name: 'Phát triển TP.HCM' },
  { code: 'SHB', shortName: 'SHB', name: 'Sài Gòn - Hà Nội' },
  { code: 'MSB', shortName: 'MSB', name: 'Hàng Hải' },
  { code: 'OCB', shortName: 'OCB', name: 'Phương Đông' },
  { code: 'LPB', shortName: 'LPBank', name: 'Lộc Phát Việt Nam (Bưu điện Liên Việt)' },
  { code: 'SEAB', shortName: 'SeABank', name: 'Đông Nam Á' },
  { code: 'ABB', shortName: 'ABBank', name: 'An Bình' },
  { code: 'BAB', shortName: 'BacABank', name: 'Bắc Á' },
  { code: 'NAB', shortName: 'NamABank', name: 'Nam Á' },
  { code: 'CAKE', shortName: 'CAKE', name: 'CAKE by VPBank' },
  { code: 'TIMO', shortName: 'Timo', name: 'Timo by BanVietBank' },
];
