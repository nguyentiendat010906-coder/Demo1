import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { TableService, ApiTable, TableStatus } from '../../services/table.service';
import { TableGroupService, TableGroup } from '../../services/table-group.service';
import { InvoiceService } from '../../services/invoice.service';
import { ModalService } from '../../shared/modal.service';
import { CustomerModalComponent } from '../../shared/customer-modal/customer-modal.component';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer';
import { Product } from '../../models/product';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { NotificationService } from '../../services/notification.service';

// Interfaces
interface InvoiceItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

// Thêm vào phần interfaces
interface TableWithItems extends ExtendedApiTable {
  itemNames?: string[]; // Danh sách tên món trong đơn
}

interface ExtendedApiTable extends ApiTable {
  customerName?: string;
  customerPhone?: string;
  startDate?: Date | string;
  totalAmount?: number;
  invoiceId?: number;
  serviceMinutes?: number;
  area?: string;
  itemNames?: string[]; // Danh sách tên món trong đơn
}

interface ExtendedTableGroup extends Omit<TableGroup, 'tables'> {
  tables: ExtendedApiTable[];
}

@Component({
  selector: 'app-pos-merged',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerModalComponent, ScrollingModule],
  templateUrl: './tables.component.html',
  styleUrls: ['./tables.component.css']
})
export class TablesComponent implements OnInit {
  // Tab management
  activeTab: 'rooms' | 'menu' = 'rooms';
  
  // Table data
  groups: ExtendedTableGroup[] = [];
  tables: ExtendedApiTable[] = [];
  selectedTable: ExtendedApiTable | null = null;
  
  // Invoice data
  invoiceId: number | null = null;
  items: InvoiceItem[] = [];
  startTime = new Date();
  
  // Menu data
  menu: Product[] = [];
  filteredMenu: Product[] = [];
  categories: string[] = [];
  selectedCategory = 'all';
  
  // Customer data
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
  
  // UI controls
  searchQuery = '';
  customerSearch = '';
  autoOpenMenu = false;
  showCustomerModal = false;
  showSearchBar = false; // ✅ THÊM: Trạng thái hiển thị thanh tìm kiếm
  advancedSearchQuery = '';
  isSearchMode = false;

    // ✅ SEARCH DROPDOWN - THÊM MỚI
  showSearchDropdown = false;
  searchResults: Product[] = [];
  filteredMenuCount = 0;
  private searchTimeout: any;
  
  // Filters
// ✅ THÊM CÁC DÒNG NÀY:
tableGroupFilters: string[] = [];
productCategoryFilters: string[] = [];
selectedFilter = 'Tất cả';

get currentFilters(): string[] {
  if (this.activeTab === 'rooms') {
    return this.tableGroupFilters;
  } else {
    return this.productCategoryFilters;
  }
}
  
  statusList = [
    { key: 'all', label: 'Tất cả', icon: 'fa-solid fa-table-cells-large' },
    { key: 'empty', label: 'Trống', icon: 'fa-solid fa-table' },
    { key: 'serving', label: 'Đang phục vụ', icon: 'fa-solid fa-utensils' },
    { key: 'reserved', label: 'Đã đặt', icon: 'fa-solid fa-clock' }
  ];
  selectedStatus = 'all';
  
  // Other
  cashier = 'Admin';
  discount = 0;
  // VAT options
vatRate = 0.1; // Mặc định 10%
vatOptions = [
  { value: 0, label: '0%' },
  { value: 0.05, label: '5%' },
  { value: 0.08, label: '8%' },
  { value: 0.1, label: '10%' },
  { value: -1, label: 'KCT' }, // Không chịu thuế
  { value: -2, label: 'KKKNT' } // Không kê khai không nộp thuế
];

  constructor(
    private productService: ProductService,
    private tableService: TableService,
    private tableGroupService: TableGroupService,
    private invoiceService: InvoiceService,
    private route: ActivatedRoute,
    private router: Router,
    private modalService: ModalService,
    private customerService: CustomerService,
    private location: Location,
    private notificationService: NotificationService
    
  ) {}

ngOnInit() {
  document.body.style.overflow = 'hidden';
  document.querySelector('app-sidebar')?.setAttribute('style', 'display: none !important');
  document.querySelector('app-topbar')?.setAttribute('style', 'display: none !important');
  
  this.loadTables();
  this.loadMenu();
  this.loadTableGroupFilters();
  
  // Listen for customer modal events
  this.modalService.openModal$.subscribe(name => {
    if (name === 'customer') {
      this.showCustomerModal = true;
    }
  });
  

}
onSearchChange(): void {
  // Clear timeout cũ
  if (this.searchTimeout) {
    clearTimeout(this.searchTimeout);
  }
  
  // Debounce search - chờ 300ms sau khi user ngừng gõ
  this.searchTimeout = setTimeout(() => {
    this.performSearch();
  }, 300);
}

/**
 * Thực hiện tìm kiếm và hiển thị dropdown
 */
performSearch(): void {
  if (!this.searchQuery || this.searchQuery.trim() === '') {
    this.searchResults = [];
    this.showSearchDropdown = false;
    return;
  }
  
  const query = this.searchQuery.toLowerCase().trim();
  
  // Lọc menu
  const filtered = this.menu.filter(item => 
    item.name.toLowerCase().includes(query)
  );
  
  this.filteredMenuCount = filtered.length;
  
  // Lấy tối đa 5 kết quả cho dropdown
  this.searchResults = filtered.slice(0, 5);
  
  // Hiển thị dropdown
  this.showSearchDropdown = true;
  
  console.log(`🔍 Search: "${query}" → ${filtered.length} results (showing ${this.searchResults.length})`);
}

/**
 * Chọn món từ dropdown và thêm vào đơn
 */
selectSearchResult(product: Product): void {
  // ✅ KIỂM TRA ĐÃ CHỌN BÀN CHƯA
  if (!this.selectedTable) {
    this.notificationService.warning('Vui lòng chọn bàn trước khi thêm món');
    return;
  }
  
  // Thêm món vào đơn
  this.addItem(product);
  
  // Clear search
  this.clearSearch();
  
}

/**
 * Xem tất cả kết quả - chuyển sang tab menu
 */
viewAllResults(): void {
  // Chuyển sang tab menu và hiển thị kết quả
  this.changeTab('menu');
  this.filterMenu();
  this.showSearchDropdown = false;
}

/**
 * Xóa tìm kiếm
 */
clearSearch(): void {
  this.searchQuery = '';
  this.searchResults = [];
  this.showSearchDropdown = false;
  this.filteredMenuCount = 0;
  
  // Clear timeout nếu đang chờ
  if (this.searchTimeout) {
    clearTimeout(this.searchTimeout);
  }
}

/**
 * Xử lý khi input mất focus
 */
onSearchBlur(): void {
  // Delay để cho phép click vào dropdown item
  setTimeout(() => {
    this.showSearchDropdown = false;
  }, 200);
}

/**
 * Xử lý khi input được focus
 */
onSearchFocus(): void {
  // Nếu có query và có kết quả, hiển thị lại dropdown
  if (this.searchQuery && this.searchResults.length > 0) {
    this.showSearchDropdown = true;
  }
}

  // ==================== TAB MANAGEMENT ====================
changeTab(tab: 'rooms' | 'menu') {
  this.activeTab = tab;
  
  // ✅ THÊM: Reset filter về "Tất cả"
  this.selectedFilter = 'Tất cả';
  
  if (tab === 'rooms') {
    this.filterTables();
  } else {
    this.filterMenu();
  }
}
  // ✅ THÊM METHOD MỚI (đặt sau loadTables())
loadTableGroupFilters() {
  this.tableGroupService.getGroups().subscribe({
    next: (groups) => {
      const groupNames = groups.map(g => g.name);
      this.tableGroupFilters = ['Tất cả', ...groupNames];
      console.log('✅ Table Group Filters:', this.tableGroupFilters);
    }
  });
}

  // ==================== TABLE MANAGEMENT ====================
  loadTables() {
    this.tableGroupService.getGroups().subscribe({
      next: (groups) => {
        this.groups = groups.map(group => ({
          ...group,
          tables: group.tables.map(table => ({
            ...table,
            area: group.name
          } as ExtendedApiTable))
        }));
        
        // Flatten all tables
        this.tables = this.groups.flatMap(g => g.tables);
        
        // Load invoice info for serving tables
        this.loadInvoiceInfoForServingTables();
      },
      error: (err) => {
        console.error('❌ Error loading tables:', err);
      }
    });
  }

loadInvoiceInfoForServingTables() {
  const servingTables = this.tables.filter(t => t.status === 'serving');
  
  if (servingTables.length === 0) return;
  
  const invoiceRequests = servingTables.map(table => 
    this.invoiceService.getInvoiceByTable(table.id).pipe(
      map(invoice => {
        return this.invoiceService.getInvoiceItems(invoice.id).pipe(
          map(items => {
            const subTotal = items.reduce((sum, item) => 
              sum + (item.unitPrice * item.quantity), 0
            );
            const vatRate = 0.1; // Hoặc lấy từ invoice nếu có
            const vat = subTotal * vatRate;
            const total = subTotal + vat;
            
            const itemNames = items.map(item => item.productName);
            
            return {
              tableId: table.id,
              invoiceId: invoice.id,
              startDate: invoice.invoiceDate,
              totalAmount: total,
              serviceMinutes: Math.floor(
                (Date.now() - new Date(invoice.invoiceDate).getTime()) / 60000
              ),
              customerName: invoice.customerName || '',
              customerPhone: invoice.customerPhone || '',
              itemNames: itemNames
            };
          }),
          catchError(() => of(null))
        );
      }),
      catchError(() => of(of(null)))
    )
  );

  forkJoin(invoiceRequests).subscribe(observables => {
    forkJoin(observables.filter(obs => obs !== null)).subscribe(invoiceInfos => {
      const invoiceMap = new Map();
      invoiceInfos.forEach(info => {
        if (info) {
          invoiceMap.set(info.tableId, info);
        }
      });

      // Cập nhật this.groups
      this.groups = this.groups.map(group => ({
        ...group,
        tables: group.tables.map(table => {
          if (table.status === 'serving' && invoiceMap.has(table.id)) {
            const invoiceInfo = invoiceMap.get(table.id);
            return {
              ...table,
              invoiceId: invoiceInfo.invoiceId,
              startDate: invoiceInfo.startDate,
              totalAmount: invoiceInfo.totalAmount,
              serviceMinutes: invoiceInfo.serviceMinutes,
              customerName: invoiceInfo.customerName,
              customerPhone: invoiceInfo.customerPhone,
              itemNames: invoiceInfo.itemNames
            };
          }
          return table;
        })
      }));
      
      console.log('✅ Invoice info loaded with items:', this.groups);
      
      // ✅✅✅ TỰ ĐỘNG ÁP DỤNG LẠI FILTER SAU KHI LOAD XONG
      if (this.isSearchMode) {
        this.performAdvancedSearch();
      } else {
        this.filterTables();
      }
    });
  });
}

selectTable(table: ExtendedApiTable | null) {
  // ✅ BẮT BUỘC PHẢI CHỌN BÀN
  if (!table) {
    alert('Vui lòng chọn bàn trước khi thêm món');
    return;
  }
  
  this.selectedTable = table;
  
  if (table.status === 'serving') {
    // Bàn đang phục vụ → Load invoice hiện tại
    this.loadInvoiceForTable(table.id);
  } else if (table.status === 'empty') {
    // ✅ BÀN TRỐNG → CHỈ CHỌN, CHƯA TẠO INVOICE
    this.invoiceId = null;
    this.items = [];
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
  }
  
  // Auto open menu if enabled
  if (this.autoOpenMenu) {
    this.activeTab = 'menu';
  }
}

createInvoiceAndAddItem(table: ExtendedApiTable, product: Product) {
  this.tableService.openTable(table.id).subscribe({
    next: (response) => {
      console.log('✅ Invoice created:', response);
      
      table.status = 'serving';
      
      this.invoiceService.getInvoiceByTable(table.id).subscribe({
        next: (invoice) => {
          this.invoiceId = invoice.id;
          this.startTime = new Date(invoice.invoiceDate);
          
          if (this.invoiceId === null) {
            console.error('❌ Invoice ID is null');
            return;
          }
          
          const itemDto = { 
            productId: product.id, 
            quantity: 1, 
            unitPrice: product.price 
          };
          this.invoiceService.addInvoiceItem(this.invoiceId, itemDto).subscribe({
            next: () => {
              // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
              this.loadInvoiceItems(() => this.updateCurrentTableInfo());
            }
          });
        }
      });
    }
  });
}

  // ==================== INVOICE MANAGEMENT ====================
loadInvoiceForTable(tableId: number) {
  this.invoiceService.getInvoiceByTable(tableId).subscribe({
    next: (invoice) => {
      this.invoiceId = invoice.id;
      this.startTime = new Date(invoice.invoiceDate);
      
      this.customer = {
        id: 0,
        group: '',
        code: '',
        name: invoice.customerName || '',
        taxCode: invoice.customerTaxCode || '',
        cccd: invoice.customerIdCard || '',
        phone: invoice.customerPhone || '',
        address: invoice.customerAddress || '',
        email: invoice.customerEmail || ''
      };
      
      console.log('✅ Invoice loaded:', invoice);
      this.loadInvoiceItems(); // ✅ Giữ nguyên, không cần callback ở đây
    },
    error: () => {
      console.log('⚠️ No existing invoice, creating new one');
    }
  });
}

loadInvoiceItems(callback?: () => void) {
  if (!this.invoiceId) return;
  
  this.invoiceService.getInvoiceItems(this.invoiceId).subscribe({
    next: (items) => {
      this.items = items;
      console.log('✅ Items loaded:', items);
      
      // ✅ GỌI CALLBACK SAU KHI LOAD XONG
      if (callback) {
        callback();
      }
    }
  });
}

  // ==================== MENU MANAGEMENT ====================
  loadMenu() {
    this.productService.getAllProducts().subscribe({
      next: (products: Product[]) => {
        this.menu = products.filter(p =>
          p.unitType === 'Thời gian' || (p.stock ?? 0) > 0
        );
        
        const categories = [...new Set(this.menu.map(p => p.category))];
      this.productCategoryFilters = ['Tất cả', ...categories];
      
      this.filteredMenu = this.menu;
      console.log('✅ Product Category Filters:', this.productCategoryFilters);
      }
    });
  }

selectFilter(filter: string) {
  // ✅ Nếu đang search, không cho phép đổi filter
  if (this.isSearchMode) {
    return;
  }
  
  this.selectedFilter = filter;
  
  if (this.activeTab === 'rooms') {
    this.filterTables();
  } else {
    this.filterMenu();
  }
}

selectStatus(status: string) {
  // ✅ Nếu đang search, không cho phép đổi status
  if (this.isSearchMode) {
    return; // Hoặc có thể tắt search trước
  }
  
  this.selectedStatus = status;
  this.filterTables();
}

  filterMenu() {
    this.filteredMenu = this.menu.filter(p => {
      const matchCategory = this.selectedFilter === 'Tất cả' || p.category === this.selectedFilter;
      const matchSearch = p.name.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }

filterTables() {
  // Bước 1: Lấy tất cả bàn hoặc lọc theo nhóm
  let filteredByGroup: ExtendedApiTable[];
  
  if (this.selectedFilter === 'Tất cả') {
    filteredByGroup = this.groups.flatMap(g => g.tables);
  } else {
    const selectedGroup = this.groups.find(g => g.name === this.selectedFilter);
    filteredByGroup = selectedGroup ? selectedGroup.tables : [];
  }
  
  // Bước 2: Lọc theo trạng thái
  if (this.selectedStatus === 'all') {
    this.tables = filteredByGroup;
  } else {
    this.tables = filteredByGroup.filter(table => table.status === this.selectedStatus);
  }
}

  // ==================== ORDER MANAGEMENT ====================
  addNewItem() {
    // Open menu tab to add items
    this.activeTab = 'menu';
  }

addItem(product: Product) {
  // ✅ BẮT BUỘC PHẢI CHỌN BÀN TRƯỚC
  if (!this.selectedTable) {
    alert('Vui lòng chọn bàn trước khi thêm món');
    return;
  }
  
  if (!this.invoiceId) {
    if (this.selectedTable.status === 'empty') {
      this.createInvoiceAndAddItem(this.selectedTable, product);
      return;
    }
  }
  
  const existing = this.items.find(x => x.productId === product.id);

  if (existing) {
    const dto = { 
      productId: existing.productId, 
      quantity: existing.quantity + 1, 
      unitPrice: existing.unitPrice 
    };
    this.invoiceService.updateInvoiceItem(this.invoiceId!, existing.id, dto).subscribe({
      next: () => {
        // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
        this.loadInvoiceItems(() => this.updateCurrentTableInfo());
      }
    });
  } else {
    const itemDto = { 
      productId: product.id, 
      quantity: 1, 
      unitPrice: product.price 
    };
    this.invoiceService.addInvoiceItem(this.invoiceId!, itemDto).subscribe({
      next: () => {
        // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
        this.loadInvoiceItems(() => this.updateCurrentTableInfo());
      }
    });
  }
}

updateQuantity(itemId: number, newQuantity: number) {
  if (!this.invoiceId) return;
  
  if (newQuantity <= 0) {
    this.remove(this.items.find(i => i.id === itemId)!);
    return;
  }
  
  const item = this.items.find(i => i.id === itemId);
  if (!item) return;
  
  const dto = { productId: item.productId, quantity: newQuantity, unitPrice: item.unitPrice };
  this.invoiceService.updateInvoiceItem(this.invoiceId, itemId, dto).subscribe({
    next: () => {
      // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
      this.loadInvoiceItems(() => this.updateCurrentTableInfo());
    }
  });
}

increase(item: InvoiceItem) {
  if (!this.invoiceId) return;
  const dto = { productId: item.productId, quantity: item.quantity + 1, unitPrice: item.unitPrice };
  this.invoiceService.updateInvoiceItem(this.invoiceId, item.id, dto).subscribe({
    next: () => {
      // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
      this.loadInvoiceItems(() => this.updateCurrentTableInfo());
    }
  });
}

decrease(item: InvoiceItem) {
  if (!this.invoiceId || item.quantity <= 1) return;
  const dto = { productId: item.productId, quantity: item.quantity - 1, unitPrice: item.unitPrice };
  this.invoiceService.updateInvoiceItem(this.invoiceId, item.id, dto).subscribe({
    next: () => {
      // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
      this.loadInvoiceItems(() => this.updateCurrentTableInfo());
    }
  });
}

remove(item: InvoiceItem) {
  if (!this.invoiceId) return;
  this.invoiceService.deleteInvoiceItem(this.invoiceId, item.id).subscribe({
    next: () => {
      // ✅ ĐỢI LOAD XONG RỒI MỚI CẬP NHẬT
      this.loadInvoiceItems(() => this.updateCurrentTableInfo());
    }
  });
}

  removeMenuItem(itemId: number) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      this.remove(item);
    }
  }

  // ==================== CUSTOMER MANAGEMENT ====================
  openCustomerModal() {
    this.showCustomerModal = true;
  }

  closeCustomerModal() {
    this.showCustomerModal = false;
  }





// ✅ CẬP NHẬT: saveCustomerInfo
async saveCustomerInfo(customer: Customer) {
  // ✅ THÊM: Confirm trước khi lưu
  const confirmed = await this.notificationService.confirm({
    title: 'Xác nhận lưu thông tin',
    message: `Lưu thông tin khách hàng: ${customer.name}${customer.phone ? ' - ' + customer.phone : ''}?`,
    confirmText: 'Lưu',
    cancelText: 'Hủy'
  });

  if (!confirmed) {
    return; // ✅ Không đóng modal nếu hủy
  }

  this.customer = customer;

  if (!this.invoiceId) {
    this.closeCustomerModal();
    this.notificationService.success('Đã lưu thông tin khách hàng!');
    return;
  }

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
      this.notificationService.success('Đã lưu thông tin khách hàng!');
      
      // ✅ Cập nhật thông tin bàn nếu có
      if (this.selectedTable) {
        this.selectedTable = {
          ...this.selectedTable,
          customerName: customer.name,
          customerPhone: customer.phone
        };
        
        // Cập nhật trong groups
        this.groups = this.groups.map(group => ({
          ...group,
          tables: group.tables.map(table => {
            if (table.id === this.selectedTable!.id) {
              return {
                ...table,
                customerName: customer.name,
                customerPhone: customer.phone
              };
            }
            return table;
          })
        }));
      }
    },
    error: (err) => {
      console.error(err);
      this.notificationService.error('Có lỗi khi lưu thông tin khách hàng');
    }
  });
}

  // ==================== CALCULATIONS ====================
  get orderItems() {
    return this.items;
  }

  get orderCode() {
    return this.invoiceId || 'Mới';
  }

  get itemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get subTotal() {
    return this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }

  get vat() {
  // ✅ SỬA PHẦN NÀY:
  if (this.vatRate < 0) {
    return 0; // KCT hoặc KKKNT không tính VAT
  }
  return this.subTotal * this.vatRate;
}
// ✅ THÊM METHOD MỚI (đặt sau formatServiceTime)
get vatLabel(): string {
  const option = this.vatOptions.find(opt => opt.value === this.vatRate);
  return option ? option.label : '10%';
}

  get totalAmount() {
    return this.subTotal + this.vat - this.discount;
  }

  get serviceMinutes(): number {
    if (!this.selectedTable?.serviceMinutes) {
      return Math.floor((Date.now() - this.startTime.getTime()) / 60000);
    }
    return this.selectedTable.serviceMinutes;
  }

// ✅ THÊM METHOD MỚI - CẬP NHẬT NGAY LẬP TỨC CHỈ BÀN HIỆN TẠI
updateCurrentTableInfo() {
  if (!this.selectedTable || !this.invoiceId) return;
  
  // Tính toán tổng tiền từ this.items hiện tại
  const subTotal = this.items.reduce((sum, item) => 
    sum + (item.unitPrice * item.quantity), 0
  );
  const vat = this.vatRate < 0 ? 0 : subTotal * this.vatRate; // ✅
  const total = subTotal + vat;
  
  const itemNames = this.items.map(item => item.productName);
  
  const serviceMinutes = Math.floor(
    (Date.now() - this.startTime.getTime()) / 60000
  );
  
  // ✅ CẬP NHẬT selectedTable
  this.selectedTable = {
    ...this.selectedTable,
    totalAmount: total,
    serviceMinutes: serviceMinutes,
    itemNames: itemNames
  };
  
  // ✅ CẬP NHẬT trong this.groups
  this.groups = this.groups.map(group => ({
    ...group,
    tables: group.tables.map(table => {
      if (table.id === this.selectedTable!.id) {
        return {
          ...table,
          totalAmount: total,
          serviceMinutes: serviceMinutes,
          itemNames: itemNames
        };
      }
      return table;
    })
  }));
  
  // ✅ CẬP NHẬT trong this.tables
  this.tables = this.tables.map(table => {
    if (table.id === this.selectedTable!.id) {
      return {
        ...table,
        totalAmount: total,
        serviceMinutes: serviceMinutes,
        itemNames: itemNames
      };
    }
    return table;
  });
  
  console.log('✅ Table info updated instantly');
}

  // ==================== ACTIONS ====================
  addNewOrder() {
    // Reset current order and let user select a new table
    this.selectedTable = null;
    this.invoiceId = null;
    this.items = [];
    this.activeTab = 'rooms';
  }

  refreshOrders() {
    if (this.selectedTable) {
      this.loadInvoiceForTable(this.selectedTable.id);
    }
    this.loadTables();
  }


  payment() {
    if (!this.invoiceId) {
      alert('Chưa có hóa đơn để thanh toán');
      return;
    }
    
    if (this.items.length === 0) {
      alert('Hóa đơn chưa có món nào');
      return;
    }
    
    const confirmPayment = confirm(`Xác nhận thanh toán ${this.totalAmount.toLocaleString('vi-VN')} đ?`);
    
    if (confirmPayment) {
      const endTime = new Date();
      
      this.invoiceService.checkout(this.invoiceId, endTime).subscribe({
        next: () => {
          console.log('✅ Invoice checked out');
          alert('Thanh toán thành công!');
          
          // Reset state
          this.selectedTable = null;
          this.invoiceId = null;
          this.items = [];
          
          // Reload tables
          this.loadTables();
          this.activeTab = 'rooms';
        },
        error: (err) => {
          console.error('❌ Error during checkout:', err);
          alert('Có lỗi khi thanh toán');
        }
      });
    }
  }

  saveInvoice() {
    this.payment();
  }

  async cancelInvoice() {
    if (!this.invoiceId) {
      // Nếu chưa có invoice và chưa chọn bàn, chỉ cần reset
      this.selectedTable = null;
      this.items = [];
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
      return;
    }
    
    const confirmed = await this.notificationService.confirm({
      title: 'Xác nhận hủy đơn hàng',
      message: `Bạn có chắc muốn hủy đơn hàng ${this.selectedTable ? 'của bàn ' + this.selectedTable.name : 'này'} không? Hóa đơn sẽ bị xóa hoàn toàn.`,
      confirmText: 'Hủy đơn',
      cancelText: 'Không'
    });
    
    if (!confirmed) {
      return;
    }
    
    // ✅ XÓA INVOICE TRỰC TIẾP
    if (this.invoiceId) {
      this.invoiceService.deleteInvoice(this.invoiceId).subscribe({
        next: () => {
          console.log('✅ Invoice deleted');
          
          // ✅ Nếu có bàn, cập nhật trạng thái về empty
          if (this.selectedTable) {
            this.tableService.updateStatus(this.selectedTable.id, 'empty').subscribe({
              next: () => {
                console.log('✅ Table status updated to empty');
                this.notificationService.success('Đã hủy đơn hàng!');
                this.resetAndReload();
              },
              error: (err: any) => {
                console.error('❌ Error updating table status:', err);
                this.notificationService.error('Có lỗi khi cập nhật trạng thái bàn');
              }
            });
          } else {
            this.notificationService.success('Đã hủy đơn hàng!');
            this.resetAndReload();
          }
        },
        error: (err: any) => {
          console.error('❌ Error deleting invoice:', err);
          this.notificationService.error('Có lỗi khi hủy đơn hàng');
        }
      });
    } else if (this.selectedTable) {
      // Không có invoice nhưng có bàn cần reset
      this.tableService.updateStatus(this.selectedTable.id, 'empty').subscribe({
        next: () => {
          console.log('✅ Table status updated to empty');
          this.notificationService.success('Đã hủy đơn hàng!');
          this.resetAndReload();
        },
        error: (err: any) => {
          console.error('❌ Error updating table status:', err);
          this.notificationService.error('Có lỗi khi cập nhật trạng thái bàn');
        }
      });
    } else {
      this.notificationService.success('Đã hủy đơn hàng!');
      this.resetAndReload();
    }
  }

  // ✅ HELPER METHOD ĐỂ RESET STATE VÀ RELOAD
  private resetAndReload() {
    this.selectedTable = null;
    this.invoiceId = null;
    this.items = [];
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
    
    this.loadTables();
    this.activeTab = 'rooms';
  }

// ==================== ACTIONS ====================
goBack() {
  // ✅ QUAY VỀ TRANG TRƯỚC ĐÓ
  this.location.back();
}
// ==================== SEARCH MANAGEMENT ====================
toggleSearchBar() {
  this.showSearchBar = !this.showSearchBar;
  
  if (this.showSearchBar) {
    setTimeout(() => {
      const searchInput = document.querySelector('.advanced-search-input') as HTMLInputElement;
      searchInput?.focus();
    }, 100);
  } else {
    // ✅ Clear search và reset
    this.advancedSearchQuery = '';
    this.isSearchMode = false; // ✅ THÊM
    this.filterTables();
  }
}

performAdvancedSearch() {
  const query = this.advancedSearchQuery.toLowerCase().trim();
  
  if (!query) {
    this.isSearchMode = false;
    this.filterTables();
    return;
  }
  
  this.isSearchMode = true;
  
  // Lấy TẤT CẢ bàn
  const allTables = this.groups.flatMap(g => g.tables);
  
  // ✅ DEBUG: Xem itemNames có trong data không
  console.log('🔍 All tables with items:', allTables.map(t => ({
    name: t.name,
    status: t.status,
    itemNames: t.itemNames
  })));
  
  // Tìm kiếm
  this.tables = allTables.filter(table => {
    const matchTableName = table.name.toLowerCase().includes(query);
    const matchCustomerName = (table.customerName || '').toLowerCase().includes(query);
    const itemNames = table.itemNames || [];
    const matchItems = itemNames.some(name => name.toLowerCase().includes(query));
    
    // ✅ DEBUG
    if (matchItems) {
      console.log(`✅ Found match in items for ${table.name}:`, itemNames);
    }
    
    return matchTableName || matchCustomerName || matchItems;
  });
  
  console.log(`🔍 Search: "${query}" → ${this.tables.length}/${allTables.length} tables`);
}

// ✅ THÊM VÀO CLASS TablesComponent
formatServiceTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}g${mins > 0 ? mins + 'p' : ''}`;
  }
  return `${mins}p`;
}
}