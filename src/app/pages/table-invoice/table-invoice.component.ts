import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { TableService } from '../../services/table.service';
import { InvoiceService } from '../../services/invoice.service';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  unitType: 'Số lượng' | 'Thời gian';
  stock: number | null;
}

interface InvoiceItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

@Component({
  selector: 'app-table-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-invoice.component.html',
  styleUrls: ['./table-invoice.component.css']
})
export class TableInvoiceComponent implements OnInit {
  tableId = 0;
  tableName = '';
  groupName = '';
  cashier = 'Admin';

  startTime = new Date();

  menu: Product[] = [];
  filteredMenu: Product[] = [];
  items: InvoiceItem[] = [];
  discount = 0;

  invoiceId: number | null = null;

  // Filter controls
  selectedCategory = 'all';
  searchText = '';
  categories: string[] = [];

  // Customer info
  customerName = '';
  customerPhone = '';

  constructor(
    private productService: ProductService,
    private tableService: TableService,
    private invoiceService: InvoiceService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.tableId = +params['id'];
      this.loadTableInfo();
      this.loadMenu();
      this.initInvoice();
    });
  }

  // ===== LOAD TABLE INFO =====
  loadTableInfo() {
    this.tableService.getTableById(this.tableId).subscribe({
      next: (table: any) => {
        this.tableName = table.name;
        this.groupName = table.tableGroupName || 'Chưa có nhóm';
        console.log('✅ Table info loaded:', table);
      }
    });
  }

  // ===== LOAD MENU =====
  loadMenu() {
    this.productService.getAllProducts().subscribe({
      next: (products: Product[]) => {
        this.menu = products.filter(p =>
          p.unitType === 'Thời gian' || (p.stock ?? 0) > 0
        );
        
        // Extract unique categories
        this.categories = ['all', ...new Set(this.menu.map(p => p.category))];
        
        this.filteredMenu = this.menu;
        console.log('✅ Menu loaded:', this.menu);
        console.log('✅ Categories:', this.categories);
      }
    });
  }

  // ===== FILTER MENU =====
  filterMenu() {
    this.filteredMenu = this.menu.filter(p => {
      const matchCategory = this.selectedCategory === 'all' || p.category === this.selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(this.searchText.toLowerCase());
      return matchCategory && matchSearch;
    });
  }

  onCategoryChange() {
    this.filterMenu();
  }

  onSearchChange() {
    this.filterMenu();
  }

  // ===== INIT INVOICE =====
  initInvoice() {
    this.invoiceService.getInvoiceByTable(this.tableId).subscribe({
      next: (invoice) => {
        this.invoiceId = invoice.id;
        this.startTime = new Date(invoice.invoiceDate);
        this.customerName = invoice.customerName || '';
        this.customerPhone = invoice.customerPhone || '';
        console.log('✅ Existing invoice loaded:', invoice);
        this.loadInvoiceItems();
      },
      error: () => {
        this.invoiceService.createInvoiceForTable(this.tableId).subscribe({
          next: (invoice) => {
            this.invoiceId = invoice.id;
            this.startTime = new Date(invoice.invoiceDate);
            console.log('✅ New invoice created:', invoice);
            this.loadInvoiceItems();
          }
        });
      }
    });
  }

  // ===== LOAD ITEMS =====
  loadInvoiceItems() {
    if (!this.invoiceId) return;
    this.invoiceService.getInvoiceItems(this.invoiceId).subscribe({
      next: (items) => {
        this.items = items;
        console.log('✅ Items loaded:', items);
      }
    });
  }

  // ===== UPDATE CUSTOMER INFO =====
  updateCustomerInfo() {
    if (!this.invoiceId) return;
    
    console.log('Updating customer info:', { customerName: this.customerName, customerPhone: this.customerPhone });
    
    // Nếu API có endpoint để update customer info, gọi tại đây
    // this.invoiceService.updateInvoiceCustomer(this.invoiceId, {
    //   customerName: this.customerName,
    //   customerPhone: this.customerPhone
    // }).subscribe({
    //   next: () => console.log('✅ Customer info updated')
    // });
  }

  // ===== POS CORE =====
  addItem(p: Product) {
    if (!this.invoiceId) return;

    const existing = this.items.find(x => x.productId === p.id);

    if (existing) {
      const dto = { productId: existing.productId, quantity: existing.quantity + 1, unitPrice: existing.unitPrice };
      this.invoiceService.updateInvoiceItem(this.invoiceId, existing.id, dto).subscribe({
        next: () => this.loadInvoiceItems()
      });
    } else {
      const itemDto = { productId: p.id, quantity: 1, unitPrice: p.price };
      this.invoiceService.addInvoiceItem(this.invoiceId, itemDto).subscribe({
        next: () => this.loadInvoiceItems()
      });
    }
  }

  increase(i: InvoiceItem) {
    if (!this.invoiceId) return;
    const dto = { productId: i.productId, quantity: i.quantity + 1, unitPrice: i.unitPrice };
    this.invoiceService.updateInvoiceItem(this.invoiceId, i.id, dto).subscribe({
      next: () => this.loadInvoiceItems()
    });
  }

  decrease(i: InvoiceItem) {
    if (!this.invoiceId || i.quantity <= 1) return;
    const dto = { productId: i.productId, quantity: i.quantity - 1, unitPrice: i.unitPrice };
    this.invoiceService.updateInvoiceItem(this.invoiceId, i.id, dto).subscribe({
      next: () => this.loadInvoiceItems()
    });
  }

  remove(i: InvoiceItem) {
    if (!this.invoiceId) return;
    this.invoiceService.deleteInvoiceItem(this.invoiceId, i.id).subscribe({
      next: () => this.loadInvoiceItems()
    });
  }

  // ===== TIME =====
  get serviceMinutes(): number {
    return Math.floor((Date.now() - this.startTime.getTime()) / 60000);
  }

  // ===== MONEY =====
  get subTotal() {
    return this.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  }

  get vat() {
    return this.subTotal * 0.1;
  }

  get total() {
    return this.subTotal + this.vat - this.discount;
  }

  // ===== CHECKOUT =====
  saveInvoice() {
    if (!this.invoiceId) return;
    
    const endTime = new Date();
    
    this.invoiceService.checkout(this.invoiceId, endTime).subscribe({
      next: () => {
        console.log('✅ Invoice checked out');
        alert('Thanh toán thành công!');
        this.router.navigate(['/invoices']);
      },
      error: (err) => {
        console.error('❌ Error saving invoice:', err);
        alert('Có lỗi khi lưu hóa đơn');
      }
    });
  }
}