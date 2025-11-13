export interface ProcessPayslipDTO {
  filial: string;
  file: Express.Multer.File;
}

export interface PayslipProcessResult {
  totalEmployees: number;
  notificationsScheduled: number;
  filial: string;
}
