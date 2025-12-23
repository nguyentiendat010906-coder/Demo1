import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface MenuItem {
  id: number;
  name: string;
  price: number;
}

interface InvoiceItem extends MenuItem {
  quantity: number;
}

@Component({
  selector: 'app-table-invoice',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './table-invoice.component.html',
  styleUrls: ['./table-invoice.component.css']
})
export class TableInvoiceComponent {

  tableId = 1;
  floor = 'Tầng 1';
  cashier = 'Nguyễn Văn A';

  startTime = new Date();

  // ===== MENU =====
  menu: MenuItem[] = [
    { id: 1, name: 'Bia Heineken', price: 35000 },
    { id: 2, name: 'Cocktail Mojito', price: 85000 },
    { id: 3, name: 'Strongbow', price: 45000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    { id: 4, name: 'Khoai tây chiên', price: 60000 },
    
    { id: 4, name: 'Khoai tây chiên', price: 60000 }
  ];

  // ===== INVOICE =====
  items: InvoiceItem[] = [];

  // 👉 THÊM MÓN (POS core)
  addItem(m: MenuItem) {
    const found = this.items.find(i => i.id === m.id);
    if (found) {
      found.quantity++;
    } else {
      this.items.push({ ...m, quantity: 1 });
    }
  }

  increase(i: InvoiceItem) {
    i.quantity++;
  }

  decrease(i: InvoiceItem) {
    if (i.quantity > 1) i.quantity--;
  }

  remove(i: InvoiceItem) {
    this.items = this.items.filter(x => x !== i);
  }

  // ===== TIME =====
  get serviceMinutes() {
    return Math.floor((Date.now() - this.startTime.getTime()) / 60000);
  }

  // ===== MONEY =====
  get subTotal() {
    return this.items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  get vat() {
    return this.subTotal * 0.1;
  }

  discount = 0;

  get total() {
    return this.subTotal + this.vat - this.discount;
  }
}
