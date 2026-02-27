import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, NgZone, TemplateRef, ViewContainerRef } from '@angular/core';
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
  import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
  import { TemplatePortal } from '@angular/cdk/portal';


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
    imports: [CommonModule, FormsModule, CustomerModalComponent, ScrollingModule, OverlayModule],
    templateUrl: './tables.component.html',
    styleUrls: ['./tables.component.css']
  })
  export class TablesComponent implements OnInit, AfterViewInit, OnDestroy {
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

  @ViewChild('filterRow') filterRow!: ElementRef;
  showFilterDropdown = false;
get visibleFilters(): string[] {
    return this._visibleFilters;
}
_visibleFilters: string[] = [];
  hiddenFilters: string[] = [];
  private resizeObserver!: ResizeObserver;

  get isHiddenFilterSelected(): boolean {
      return this.hiddenFilters.includes(this.selectedFilter);
  }

private overlayRef: OverlayRef | null = null;
@ViewChild('dropdownTemplate', { read: TemplateRef, static: true }) dropdownTemplate!: TemplateRef<any>;

private dropdownEl: HTMLElement | null = null;

toggleFilterDropdown(event: Event): void {
  event.stopPropagation();

  if (this.dropdownEl) {
    this.closeDropdown();
    return;
  }

  const btn = event.currentTarget as HTMLElement;
  const rect = btn.getBoundingClientRect();
  const panelWrapper = btn.closest('.panel-wrapper') as HTMLElement;
  const panelRect = panelWrapper?.getBoundingClientRect();
  const panelRight = panelRect ? panelRect.right : window.innerWidth;

  const dropdownWidth = 200;
  let leftPos = rect.left;
  if (leftPos + dropdownWidth > panelRight) {
    leftPos = panelRight - dropdownWidth - 8;
  }

  this.dropdownEl = document.createElement('div');
  this.dropdownEl.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 6}px;
    left: ${leftPos}px;
    z-index: 99999;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    width: ${dropdownWidth}px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;

  // Search input
  const searchWrapper = document.createElement('div');
  searchWrapper.style.cssText = 'padding:8px 10px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;gap:6px;';
  searchWrapper.innerHTML = `
    <i class="fa-solid fa-magnifying-glass" style="color:#94a3b8;font-size:12px;flex-shrink:0;"></i>
    <input type="text" placeholder="Tìm nhóm..." style="border:none;outline:none;font-size:13px;color:#1e293b;background:transparent;width:100%;" />
  `;
  this.dropdownEl.appendChild(searchWrapper);

  const searchInput = searchWrapper.querySelector('input') as HTMLInputElement;
  searchInput.addEventListener('click', e => e.stopPropagation());

  // Scroll list (max 5 items = 40px each = 200px)
  const listEl = document.createElement('div');
  listEl.style.cssText = 'max-height:200px;overflow-y:auto;overflow-x:hidden;';

  // Scrollbar style
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .filter-scroll-list::-webkit-scrollbar { width: 4px; }
    .filter-scroll-list::-webkit-scrollbar-track { background: #f8fafc; }
    .filter-scroll-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
  `;
  document.head.appendChild(styleEl);
  listEl.className = 'filter-scroll-list';

  const renderList = (filters: string[]) => {
    listEl.innerHTML = '';
    if (filters.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:12px 14px;font-size:13px;color:#94a3b8;text-align:center;';
      empty.textContent = 'Không tìm thấy';
      listEl.appendChild(empty);
      return;
    }
    filters.forEach(filter => {
      const btnEl = document.createElement('button');
      const isActive = this.selectedFilter === filter;
      btnEl.style.cssText = `display:flex;align-items:center;width:100%;padding:9px 14px;text-align:left;background:${isActive ? '#eff6ff' : 'none'};border:none;border-bottom:1px solid #f8fafc;font-size:13px;font-weight:${isActive ? '600' : '500'};color:${isActive ? '#0067c4' : '#475569'};cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;gap:8px;`;
      if (isActive) {
        btnEl.innerHTML = `<i class="fa-solid fa-check" style="font-size:11px;color:#0067c4;flex-shrink:0;"></i><span style="overflow:hidden;text-overflow:ellipsis;">${filter}</span>`;
      } else {
        btnEl.innerHTML = `<span style="width:19px;flex-shrink:0;"></span><span style="overflow:hidden;text-overflow:ellipsis;">${filter}</span>`;
      }
      btnEl.addEventListener('mouseenter', () => { if (!isActive) btnEl.style.background = '#f1f5f9'; });
      btnEl.addEventListener('mouseleave', () => { if (!isActive) btnEl.style.background = 'none'; });
      btnEl.addEventListener('click', () => {
        this.ngZone.run(() => {
          this.selectFilter(filter);
          this.closeDropdown();
        });
      });
      listEl.appendChild(btnEl);
    });
  };

  renderList(this.hiddenFilters);
  this.dropdownEl.appendChild(listEl);

  // Search logic
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim();
    const filtered = q
      ? this.hiddenFilters.filter(f => f.toLowerCase().includes(q))
      : this.hiddenFilters;
    renderList(filtered);
  });

  document.body.appendChild(this.dropdownEl);
  this.showFilterDropdown = true;

  setTimeout(() => {
    searchInput.focus();
    document.addEventListener('click', this.closeDropdownBound);
  }, 0);
}

private closeDropdownBound = () => this.ngZone.run(() => this.closeDropdown());

closeDropdown(): void {
  if (this.dropdownEl) {
    document.body.removeChild(this.dropdownEl);
    this.dropdownEl = null;
  }
  document.removeEventListener('click', this.closeDropdownBound);
  // Giữ dòng này nếu vẫn dùng overlayRef ở chỗ khác
  this.overlayRef?.dispose();
  this.overlayRef = null;
  this.showFilterDropdown = false;
}

      // ✅ SEARCH DROPDOWN - THÊM MỚI
    showSearchDropdown = false;
    searchResults: Product[] = [];
    filteredMenuCount = 0;
    private searchTimeout: any;
    
customerSearchResults: Customer[] = [];
private customerDropdownEl: HTMLElement | null = null;
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
      private notificationService: NotificationService,
      private ngZone: NgZone,
      private overlay: Overlay,                        // ← THÊM
      private viewContainerRef: ViewContainerRef
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
      this.selectedFilter = 'Tất cả';
      if (tab === 'rooms') {
          this.filterTables();
      } else {
          this.filterMenu();
      }
      setTimeout(() => this.calculateHiddenFilters(), 0);
  }
    // ✅ THÊM METHOD MỚI (đặt sau loadTables())
// SỬA LẠI - ĐÚNG
loadTableGroupFilters() {
  this.tableGroupService.getGroups().subscribe({
    next: (groups) => {
      this.tableGroupFilters = ['Tất cả', ...groups.map(g => g.name)];
      setTimeout(() => this.calculateHiddenFilters(), 500);
    }
  });
}
    // ==================== TABLE MANAGEMENT ====================
  loadTables() {
    this.tableGroupService.getGroups().subscribe({
      next: (groups) => {
        
        this.groups = groups.map(group => ({
          ...group,
          tables: group.tables.map(table => {
            return {
              ...table,
              area: group.name,
              orderCode: table.orderCode
            } as ExtendedApiTable;
          })
        }));

        this.tables = this.groups.flatMap(g => g.tables);
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
             const total = subTotal;
              
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

        // ✅ SAU KHI CÓ INVOICE INFO, GỌI API LẤY ORDER CODE
        const orderCodeRequests = servingTables
          .filter(t => invoiceMap.has(t.id))
          .map(table => {
            const invoiceInfo = invoiceMap.get(table.id);
            // ✅ GỌI API LẤY ORDERCODE
            return this.tableService.getTableById(table.id).pipe(
              map(tableData => ({
                tableId: table.id,
                orderCode: tableData.orderCode
              })),
              catchError(() => of({ tableId: table.id, orderCode: undefined }))
            );
          });

        // ✅ ĐỢI TẤT CẢ ORDER CODE
        if (orderCodeRequests.length > 0) {
          forkJoin(orderCodeRequests).subscribe(orderCodes => {
            const orderCodeMap = new Map();
            orderCodes.forEach(oc => {
              orderCodeMap.set(oc.tableId, oc.orderCode);
            });

            // ✅ CẬP NHẬT this.groups với cả invoice info VÀ orderCode
            this.groups = this.groups.map(group => ({
              ...group,
              tables: group.tables.map(table => {
                if (table.status === 'serving' && invoiceMap.has(table.id)) {
                  const invoiceInfo = invoiceMap.get(table.id);
                  const orderCode = orderCodeMap.get(table.id);
                  
                  return {
                    ...table,
                    orderCode: orderCode, // ✅ LẤY TỪ API
                    invoiceId: invoiceInfo.invoiceId,
                    startDate: invoiceInfo.startDate,
                    totalAmount: invoiceInfo.totalAmount,
                    serviceMinutes: invoiceInfo.serviceMinutes,
                    customerName: invoiceInfo.customerName,
                    customerPhone: invoiceInfo.customerPhone,
                    itemNames: invoiceInfo.itemNames
                  } as ExtendedApiTable;
                }
                return table;
              })
            }));
            
            
            // ✅ KIỂM TRA CỤ THỂ
            this.groups.forEach(group => {
              group.tables.forEach(table => {
                if (table.status === 'serving') {
                  console.log(`🔍 Table ${table.name} - orderCode: "${table.orderCode}"`);
                }
              });
            });
            
            if (this.isSearchMode) {
              this.performAdvancedSearch();
            } else {
              this.filterTables();
            }
          });
        } else {
          // Không có bàn serving nào
          if (this.isSearchMode) {
            this.performAdvancedSearch();
          } else {
            this.filterTables();
          }
        }
      });
    });
  }




private lastClickedTableId: number | null = null;
private lastClickTime = 0;

selectTable(table: ExtendedApiTable | null) {
  if (!table) {
    this.notificationService.warning('Vui lòng chọn bàn trước khi thêm món');
    return;
  }

  const now = Date.now();
  const isDoubleClick = this.lastClickedTableId === table.id && (now - this.lastClickTime) < 400;

  this.lastClickedTableId = table.id;
  this.lastClickTime = now;

  if (isDoubleClick) {
    this.activeTab = 'menu';
    return;
  }

  this.selectedTable = table;

  if (table.status === 'serving') {
    this.loadInvoiceForTable(table.id);
  } else if (table.status === 'empty') {
    this.invoiceId = null;
    this.items = [];
    this.customerSearch = '';
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

  if (this.autoOpenMenu) {
    this.activeTab = 'menu';
  }
}

  createInvoiceAndAddItem(table: ExtendedApiTable, product: Product) {
    // ✅ BƯỚC 1: TẠO INVOICE TRƯỚC
    this.tableService.openTable(table.id).subscribe({
      next: (invoiceResponse) => {
        console.log('✅ Invoice created:', invoiceResponse);
        
        table.status = 'serving';
        
        // ✅ BƯỚC 2: LẤY INVOICE ID
        this.invoiceService.getInvoiceByTable(table.id).subscribe({
          next: (invoice) => {
            this.invoiceId = invoice.id;
            this.startTime = new Date(invoice.invoiceDate);
            
            // ✅ BƯỚC 3: TẠO MÃ ĐƠN HÀNG (UPDATE BÀN)
            const orderData = {
              tableId: table.id,
              invoiceId: invoice.id
            };
            
            // ✅ LOG REQUEST DATA
            console.log('📤 Creating order with data:', orderData);
            
            this.tableService.createOrder(orderData).subscribe({
              next: (orderResponse) => {
                console.log('✅ Order created:', orderResponse.orderCode);
                
                if (this.selectedTable) {
                  this.selectedTable.orderCode = orderResponse.orderCode;
                }
                // ✅ CẬP NHẬT orderCode vào this.groups
      this.groups = this.groups.map(group => ({
        ...group,
        tables: group.tables.map(t => {
          if (t.id === table.id) {
            return { ...t, orderCode: orderResponse.orderCode };
          }
          return t;
        })
      }));
      
      // ✅ CẬP NHẬT orderCode vào this.tables
      this.tables = this.tables.map(t => {
        if (t.id === table.id) {
          return { ...t, orderCode: orderResponse.orderCode };
        }
        return t;
      });
      
      console.log('✅ OrderCode saved to all table references:', orderResponse.orderCode);
                
                const itemDto = { 
                  productId: product.id, 
                  quantity: 1, 
                  unitPrice: product.price 
                };
                
                this.invoiceService.addInvoiceItem(this.invoiceId!, itemDto).subscribe({
                  next: () => {
                    this.loadInvoiceItems(() => this.updateCurrentTableInfo());
                  },
                  error: (err) => {
                    console.error('❌ Error adding item:', err);
                    this.notificationService.error('Không thể thêm món');
                  }
                });
              },
              error: (err) => {
                // ✅ LOG CHI TIẾT LỖI
                console.error('❌ Error creating order:', err);
                console.error('❌ Error status:', err.status);
                console.error('❌ Error message:', err.message);
                console.error('❌ Error response body:', err.error); // ⭐ QUAN TRỌNG NHẤT
                
                // Hiển thị lỗi chi tiết
                let errorMsg = 'Không thể tạo mã đơn hàng';
                if (err.error?.message) {
                  errorMsg += ': ' + err.error.message;
                }
                this.notificationService.error(errorMsg);
              }
            });
          },
          error: (err) => {
            console.error('❌ Error getting invoice:', err);
            this.notificationService.error('Không thể lấy thông tin hóa đơn');
          }
        });
      },
      error: (err) => {
        console.error('❌ Error opening table:', err);
        this.notificationService.error('Không thể mở bàn');
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
        this.customerSearch = invoice.customerName || '';
        
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
  // SỬA LẠI - ĐÚNG
loadMenu() {
  this.productService.getAllProducts().subscribe({
    next: (products: Product[]) => {
      this.menu = products.filter(p =>
        p.unitType === 'Thời gian' || (p.stock ?? 0) > 0
      );
      const categories = [...new Set(this.menu.map(p => p.category))];
      this.productCategoryFilters = ['Tất cả', ...categories];
      this.filteredMenu = this.menu;
      setTimeout(() => this.calculateHiddenFilters(), 500); // tăng lên 500
    }
  });
}

selectFilter(filter: string): void {
  if (this.isSearchMode) return;
  this.selectedFilter = filter;
  this.closeDropdown(); // ← THÊM DÒNG NÀY
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
      this.notificationService.warning('Vui lòng chọn bàn trước khi thêm món');
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
  item.quantity = newQuantity;
  const dto = { productId: item.productId, quantity: newQuantity, unitPrice: item.unitPrice };
  this.invoiceService.updateInvoiceItem(this.invoiceId, itemId, dto).subscribe({
    next: () => this.updateCurrentTableInfo()
  });
}

increase(item: InvoiceItem) {
  if (!this.invoiceId) return;
  item.quantity += 1;
  const dto = { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice };
  this.invoiceService.updateInvoiceItem(this.invoiceId, item.id, dto).subscribe({
    next: () => this.updateCurrentTableInfo()
  });
}

decrease(item: InvoiceItem) {
  if (!this.invoiceId || item.quantity <= 1) return;
  item.quantity -= 1;
  const dto = { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice };
  this.invoiceService.updateInvoiceItem(this.invoiceId, item.id, dto).subscribe({
    next: () => this.updateCurrentTableInfo()
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
// ==================== CUSTOMER SEARCH ====================
onCustomerSearchChange(value?: string): void {
  const q = (value ?? this.customerSearch).trim().toLowerCase();
  this.closeCustomerDropdownEl();

  if (!q) {
    this.customerSearchResults = [];
    return;
  }

  this.customerService.getAllCustomers().subscribe({
    next: (list: Customer[]) => {
      this.customerSearchResults = list.filter((c: Customer) =>
        c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
      ).slice(0, 6);
      this.renderCustomerDropdown();
    }
  });
}

renderCustomerDropdown(): void {
  this.closeCustomerDropdownEl();

  const inputEl = document.querySelector('.search-customer input') as HTMLElement;
  if (!inputEl) return;

  const rect = inputEl.getBoundingClientRect();

  this.customerDropdownEl = document.createElement('div');
  this.customerDropdownEl.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 4}px;
    left: ${rect.left}px;
    width: ${rect.width}px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    box-shadow: 0 8px 20px rgba(0,0,0,0.15);
    z-index: 99999;
    overflow: hidden;
  `;

  if (this.customerSearchResults.length > 0) {
    this.customerSearchResults.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;';
      item.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:13px;font-weight:600;color:#1e293b;">${c.name ?? ''}</span>
          <span style="font-size:12px;color:#64748b;">${c.phone ?? ''}</span>
        </div>
        <i class="fa-solid fa-user" style="color:#0067c4;font-size:13px;opacity:0.6;"></i>
      `;
      item.addEventListener('mouseenter', () => item.style.background = '#f0f7ff');
      item.addEventListener('mouseleave', () => item.style.background = '');
      item.addEventListener('mousedown', () => {
        this.ngZone.run(() => this.selectCustomerFromSearch(c));
      });
      this.customerDropdownEl!.appendChild(item);
    });
  } else {
    const noResult = document.createElement('div');
    noResult.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px 14px;';
    noResult.innerHTML = `
      <span style="font-size:13px;color:#94a3b8;">Không tìm thấy khách hàng</span>
      <button style="background:none;border:1px solid #0067c4;color:#0067c4;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;">+ Thêm mới</button>
    `;
    noResult.querySelector('button')?.addEventListener('mousedown', () => {
      this.ngZone.run(() => {
        this.openCustomerModal();
        this.closeCustomerDropdownEl();
      });
    });
    this.customerDropdownEl.appendChild(noResult);
  }

  document.body.appendChild(this.customerDropdownEl);
}

onCustomerSearchFocus(): void {
  if (this.customerSearch.trim() && this.customerSearchResults.length > 0) {
    this.renderCustomerDropdown();
  }
}

onCustomerSearchBlur(): void {
  setTimeout(() => this.closeCustomerDropdownEl(), 200);
}

selectCustomerFromSearch(c: Customer): void {
  this.customer = c;
  this.customerSearch = c.name ?? '';
  this.closeCustomerDropdownEl();
  if (this.invoiceId) {
    this.invoiceService.updateInvoiceCustomer(this.invoiceId, {
      customerName: c.name,
      customerPhone: c.phone,
      customerTaxCode: c.taxCode,
      customerIdCard: c.cccd,
      customerEmail: c.email,
      customerAddress: c.address
    }).subscribe();
  }
}

closeCustomerDropdownEl(): void {
  if (this.customerDropdownEl) {
    document.body.removeChild(this.customerDropdownEl);
    this.customerDropdownEl = null;
  }
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
this.customerSearch = customer.name ?? '';

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
  this.customerSearch = customer.name ?? '';
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
    // Thêm vào class TablesComponent
  getProductUnit(productId: number): string {
    return this.menu.find(p => p.id === productId)?.unitType || '';
  }
    get orderItems() {
      return this.items;
    }

    get orderCode() {
      return this.selectedTable?.orderCode || 'Mới';
    }

    get itemCount() {
      return this.items.reduce((sum, item) => sum + item.quantity, 0);
    }

    get subTotal() {
      return this.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    }

    get vat() {
    
    return 0;
  }
  // ✅ THÊM METHOD MỚI (đặt sau formatServiceTime)
  get vatLabel(): string {
    const option = this.vatOptions.find(opt => opt.value === this.vatRate);
    return option ? option.label : '10%';
  }

    get totalAmount() {
      return this.subTotal - this.discount;
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
    
    const total = subTotal ;
    
    const itemNames = this.items.map(item => item.productName);
    
    const serviceMinutes = Math.floor(
      (Date.now() - this.startTime.getTime()) / 60000
    );
    const orderCode = this.selectedTable.orderCode;
    // ✅ CẬP NHẬT selectedTable
    this.selectedTable = {
      ...this.selectedTable,
      orderCode: orderCode,
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
      // Nếu chưa có invoice, chỉ reset state
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
    
    const canceledTableId = this.selectedTable?.id; // ✅ LƯU LẠI ID BÀN ĐÃ HỦY
    
    // ✅ XÓA INVOICE
    if (this.invoiceId) {
      this.invoiceService.deleteInvoice(this.invoiceId).subscribe({
        next: () => {
          console.log('✅ Invoice deleted');
          
          // ✅ CẬP NHẬT TRẠNG THÁI BÀN
          if (this.selectedTable) {
            this.tableService.updateStatus(this.selectedTable.id, 'empty').subscribe({
              next: () => {
                console.log('✅ Table status updated to empty');
                this.notificationService.success('Đã hủy đơn hàng!');
                
                // ✅ CHỈ CẬP NHẬT BÀN ĐÃ HỦY THAY VÌ RELOAD TẤT CẢ
                this.updateCanceledTable(canceledTableId!);
                
                // Reset selected table
                this.selectedTable = null;
                this.invoiceId = null;
                this.items = [];
                this.customerSearch = '';
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
              },
              error: (err: any) => {
                console.error('❌ Error updating table status:', err);
                this.notificationService.error('Có lỗi khi cập nhật trạng thái bàn');
              }
            });
          }
        },
        error: (err: any) => {
          console.error('❌ Error deleting invoice:', err);
          this.notificationService.error('Có lỗi khi hủy đơn hàng');
        }
      });
    }
  }

  // ✅ THÊM METHOD MỚI: Chỉ cập nhật bàn đã hủy
  updateCanceledTable(tableId: number) {
    this.groups = this.groups.map(group => ({
      ...group,
      tables: group.tables.map(table => {
        if (table.id === tableId) {
          return {
            ...table,
            status: 'empty' as TableStatus,
            orderCode: undefined,
            invoiceId: undefined,
            totalAmount: undefined,
            serviceMinutes: undefined,
            customerName: undefined,
            customerPhone: undefined,
            itemNames: undefined
          };
        }
        return table; // ✅ GIỮ NGUYÊN CÁC BÀN KHÁC
      })
    }));
    
    // Cập nhật lại tables array
    this.tables = this.groups.flatMap(g => g.tables);
    
    // Apply filter lại
    if (this.isSearchMode) {
      this.performAdvancedSearch();
    } else {
      this.filterTables();
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


  ngAfterViewInit() {
      this.setupResizeObserver();
  }

ngOnDestroy() {
  if (this.resizeObserver) this.resizeObserver.disconnect();
  this.closeDropdown();
  this.closeCustomerDropdownEl();
}

// SỬA setupResizeObserver để retry nếu chưa có element
setupResizeObserver() {
  const tryObserve = () => {
    const el = this.filterRow?.nativeElement;
    if (el && el.clientWidth > 0) {
      this.resizeObserver = new ResizeObserver(() => {
        this.ngZone.run(() => this.calculateHiddenFilters());
      });
      this.resizeObserver.observe(el);
      this.calculateHiddenFilters();
    } else {
      setTimeout(tryObserve, 150);
    }
  };
  setTimeout(tryObserve, 500);
}

calculateHiddenFilters() {
  const container = this.filterRow?.nativeElement as HTMLElement;
  if (!container) return;

  const allFilters = this.currentFilters;
  if (!allFilters || allFilters.length === 0) return;

  this._visibleFilters = [...allFilters];
  this.hiddenFilters = [];

  setTimeout(() => {
    const containerWidth = container.clientWidth - 60;
    const buttons = Array.from(container.children) as HTMLElement[];
    if (!buttons.length) return;

    // Đo moreBtnWidth thực tế
    const tempBtn = document.createElement('button');
    tempBtn.className = 'filter-btn filter-more-btn';
    tempBtn.textContent = '···';
    tempBtn.style.cssText = 'position:fixed;top:-9999px;visibility:hidden';
    document.body.appendChild(tempBtn);
    const moreBtnWidth = tempBtn.getBoundingClientRect().width + 8;
    document.body.removeChild(tempBtn);

    const btnWidths = buttons.map(b => b.getBoundingClientRect().width + 8);
    const totalWidth = btnWidths.reduce((a, b) => a + b, 0);

    console.log('moreBtnWidth thực tế:', moreBtnWidth);

    if (totalWidth <= containerWidth) {
      this.ngZone.run(() => {
        this._visibleFilters = [...allFilters];
        this.hiddenFilters = [];
      });
      return;
    }

    let usedWidth = 0;
    let cutoff = allFilters.length;

    for (let i = 0; i < btnWidths.length; i++) {
      if (usedWidth + btnWidths[i] + moreBtnWidth > containerWidth) {
        cutoff = i;
        break;
      }
      usedWidth += btnWidths[i];
    }

    this.ngZone.run(() => {
      this._visibleFilters = allFilters.slice(0, cutoff);
      this.hiddenFilters = allFilters.slice(cutoff);
      console.log('cutoff:', cutoff, 'visible:', this._visibleFilters, 'hidden:', this.hiddenFilters);
    });
  }, 0);
}
  }