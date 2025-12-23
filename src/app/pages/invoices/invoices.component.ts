import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceService } from '../../services/invoice.service';

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
  loadingDetail = false;

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit(): void {
    this.loadInvoices();
  }

  loadInvoices() {
    this.invoiceService.getAllInvoices().subscribe(data => {
      this.invoices = data;
    });
  }

  viewDetail(id: number) {
    this.loadingDetail = true;
    this.invoiceService.getInvoiceById(id).subscribe({
      next: data => {
        this.selectedInvoice = data;
        this.loadingDetail = false;
      },
      error: () => this.loadingDetail = false
    });
  }

  closeModal() {
    this.selectedInvoice = null;
  }
}
