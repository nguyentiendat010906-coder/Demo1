import { Routes } from '@angular/router';
import { OverviewComponent } from './pages/overview/overview.component';
import { ProductsComponent } from './pages/products/products.component';
import { CustomersComponent } from './pages/customers/customers.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { InvoicesComponent } from './pages/invoices/invoices.component';  
import { TablesComponent } from './pages/tables/tables.component';
import { TableSettingComponent } from './pages/table-setting/table-setting.component';


// ✅ Sửa lại app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  { path: 'overview', component: OverviewComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'customers', component: CustomersComponent },
  { path: 'invoices', component: InvoicesComponent },
  { path: 'tables', component: TablesComponent },
  
  
  // ✅ Đổi :tableId → :id
  {
    path: 'tables/:id/invoice',
    loadComponent: () =>
      import('./pages/table-invoice/table-invoice.component')
        .then(m => m.TableInvoiceComponent)
  },
  {
  path: 'table-setting',
  loadComponent: () =>
    import('./pages/table-setting/table-setting.component')
      .then(m => m.TableSettingComponent)
}

];
