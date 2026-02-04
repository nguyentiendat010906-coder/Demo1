// CÁCH 3: Import trực tiếp (ĐƠN GIẢN NHẤT)

import { Routes } from '@angular/router';
import { OverviewComponent } from './pages/overview/overview.component';
import { ProductsComponent } from './pages/products/products.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';  
import { TablesComponent } from './pages/tables/tables.component';
import { TableSettingComponent } from './pages/table-setting/table-setting.component';

// ✅ THÊM IMPORT TRỰC TIẾP
import { TableInvoiceComponent } from './pages/table-invoice/table-invoice.component';
// HOẶC nếu đã đổi tên:
// import { TablesComponent as TableInvoiceComponent } from './pages/table-invoice/table-invoice.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'overview', component: OverviewComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'customers', component: CustomersComponent },
  { path: 'invoices', component: InvoicesComponent },
  { path: 'tables', component: TablesComponent },
  
  // ✅ SỬA THÀNH IMPORT TRỰC TIẾP
  {
    path: 'tables/:id/invoice',
    component: TableInvoiceComponent  // ⬅️ ĐƠN GIẢN HƠN
  },
  
  {
    path: 'table-setting',
    component: TableSettingComponent  // Có thể sửa thành import trực tiếp luôn
  }
];