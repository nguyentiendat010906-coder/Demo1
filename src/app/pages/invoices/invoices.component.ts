import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.css']
})
export class InvoicesComponent implements OnInit {
  invoices: any[] = [];
  selectedInvoice: any = null;
  
  private apiUrl = 'http://localhost:5054/api/invoices';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices() {
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: data => {
        this.invoices = data;
        console.log('✅ Invoices loaded:', data.length);
      },
      error: err => {
        console.error('❌ Error loading invoices:', err);
      }
    });
  }

  viewDetail(id: number) {
    this.http.get<any>(`${this.apiUrl}/${id}`).subscribe({
      next: data => {
        console.log('📦 API Response:', data);

        const startTime = data.invoiceDate ? new Date(data.invoiceDate) : null;
        const endTime = data.endTime ? new Date(data.endTime) : null;
        
        // Tính số giờ phục vụ (nếu có endTime)
        let serviceHours = 0;
        if (startTime && endTime) {
          const diffMs = endTime.getTime() - startTime.getTime();
          serviceHours = diffMs / (1000 * 60 * 60); // chuyển ms sang giờ
        }

        this.selectedInvoice = {
          id: data.id,
          status: data.status,
          tableName: data.tableName || '—',
          groupName: data.groupName || '—',
          cashierName: data.cashierName || 'ADMIN',
          customerName:data.customerName,
          invoiceDate: startTime,
          endTime: endTime,
          serviceHours: serviceHours,
          subtotal: data.subtotal || 0,
          vatAmount: data.vatAmount || 0,
          totalAmount: data.totalAmount || 0,
          invoiceDetails: data.invoiceDetails || []
        };

        console.log('✅ Selected Invoice:', this.selectedInvoice);
      },
      error: err => {
        console.error('❌ Error:', err);
        alert('Không thể tải chi tiết hóa đơn');
      }
    });
  }

  closeModal() {
    this.selectedInvoice = null;
  }

  // Helper để format số giờ phục vụ
  formatServiceTime(hours: number): string {
    if (!hours || hours === 0) return '—';
    
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    
    if (h === 0) return `${m} phút`;
    if (m === 0) return `${h} giờ`;
    return `${h} giờ ${m} phút`;
  }
}