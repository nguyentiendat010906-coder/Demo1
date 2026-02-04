export interface Product {
  id: number;
  groupID?: number;
  group?: string;       // ← Mã nhóm (N01, N02, ...)
  groupName?: string;   // ← Tên nhóm
  code?: string;        // ← Mã sản phẩm (00010, 00011, ...)
  name: string;
  price: number;
  stock?: number;
  category: string;
  unitType: string;
  unitTypeId: number;
  imageUrl?: string;
}