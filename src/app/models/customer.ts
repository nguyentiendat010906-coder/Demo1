// models/customer.ts
export interface Customer {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  cccd?: string;
  groupID?: number;    // ID nhóm để lưu/cập nhật
  code?: string;       // Mã nhóm (tự sinh - chỉ hiển thị)
  group?: string;      // Tên nhóm (từ JOIN - chỉ hiển thị)
  year?: string;
  createdAt?: string;
}