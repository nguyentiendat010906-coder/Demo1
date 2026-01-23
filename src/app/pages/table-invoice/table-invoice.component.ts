import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { TableService } from '../../services/table.service';
import { InvoiceService } from '../../services/invoice.service';
import { ModalService } from '../../shared/modal.service';
import { CustomerModalComponent } from '../../shared/customer-modal/customer-modal.component';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer';
import { Product } from '../../models/product';




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
  imports: [CommonModule, FormsModule, CustomerModalComponent],
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
  
  // ✅ KHỞI TẠO GIÁ TRỊ MẶC ĐỊNH
  customer: Customer = {
    id: 0,
    group: '',
    code: '',
    name: '',
    taxCode: '',
    cccd: '',
    phone: '',
    address: '',
    email: ''
  };

  // Filter controls
  selectedCategory = 'all';
  searchText = '';
  categories: string[] = [];
  

  // Customer info
  customerName = '';
  customerPhone = '';
  
  
  // Modal state
  showCustomerModal = false;
  
  // Additional customer information
  customerTaxCode = '';
  customerIdCard = '';
  customerEmail = '';
  customerAddress = '';

  constructor(
    private productService: ProductService,
    private tableService: TableService,
    private invoiceService: InvoiceService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService,
    private customerService: CustomerService  
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.tableId = +params['id'];
      this.loadTableInfo();
      this.loadMenu();
      this.initInvoice();
    });

    // 👇 NGHE LỆNH MỞ MODAL
    this.modalService.openModal$.subscribe(name => {
      if (name === 'customer') {
        this.showCustomerModal = true;
      }
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
        
        // Load customer info from invoice
        this.customerName = invoice.customerName || '';
        this.customerPhone = invoice.customerPhone || '';
        this.customerTaxCode = invoice.customerTaxCode || '';
        this.customerIdCard = invoice.customerIdCard || '';
        this.customerEmail = invoice.customerEmail || '';
        this.customerAddress = invoice.customerAddress || '';
        
        // ✅ CẬP NHẬT CUSTOMER OBJECT
        this.customer = {
          id: 0,
          group: '',
          code: '',
          name: this.customerName,
          taxCode: this.customerTaxCode,
          cccd: this.customerIdCard,
          phone: this.customerPhone,
          address: this.customerAddress,
          email: this.customerEmail
        };
        
        console.log('✅ Existing invoice loaded:', invoice);
        this.loadInvoiceItems();
      },
      error: () => {
        this.invoiceService.createInvoiceForTable(this.tableId).subscribe({
          next: (invoice) => {
            this.invoiceId = invoice.id;
            this.startTime = new Date(invoice.invoiceDate);
            
            // ✅ KHỞI TẠO CUSTOMER RỖNG CHO INVOICE MỚI
            this.customer = {
              id: 0,
              group: '',
              code: '',
              name: '',
              taxCode: '',
              cccd: '',
              phone: '',
              address: '',
              email: ''
            };
            
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

  // ===== CUSTOMER MODAL =====
  openCustomerModal() {
    this.showCustomerModal = true;
  }

  closeCustomerModal() {
    this.showCustomerModal = false;
  }

  saveCustomerInfo(customer: Customer) {
    // 1️⃣ Gán customer từ modal
    this.customer = customer;

    // 2️⃣ Đồng bộ sang các field đang dùng
this.customerName = customer.name ?? '';
this.customerPhone = customer.phone ?? '';
this.customerTaxCode = customer.taxCode ?? '';
this.customerIdCard = customer.cccd ?? '';
this.customerEmail = customer.email ?? '';
this.customerAddress = customer.address ?? '';

    // 3️⃣ Gọi API
    if (!this.invoiceId) return;

    const customerData = {
      customerName: customer.name,
      customerPhone: customer.phone,
      customerTaxCode: customer.taxCode || undefined,
      customerIdCard: customer.cccd || undefined,
      customerEmail: customer.email || undefined,
      customerAddress: customer.address || undefined
    };

    this.invoiceService.updateInvoiceCustomer(this.invoiceId, customerData).subscribe({
      next: () => {
        this.closeCustomerModal();
        alert('Thông tin khách hàng đã được lưu!');
      },
      error: (err) => {
        console.error(err);
        alert('Có lỗi khi lưu thông tin khách hàng');
      }
    });
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
      // ⭐ QUAY VỀ TRANG TABLES THAY VÌ INVOICES
      this.router.navigate(['/tables']).then(() => {
        // Reload lại trang để cập nhật trạng thái bàn
        window.location.reload();
      });
    },
    error: (err) => {
      console.error('❌ Error saving invoice:', err);
      alert('Có lỗi khi lưu hóa đơn');
    }
  });
}
}