import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class OverviewComponent implements OnInit {

  totalInvoices = 156;
  totalRevenue = 0;
  servingTables = 8;
  cashAmount = 0;

  topProducts: { name: string; quantity: number }[] = [];

  revenueChart: Chart | undefined;

  constructor(private productService: ProductService) {}

  ngOnInit(): void {
    this.loadRevenue();
  }

  loadRevenue() {
    this.productService.getAllProducts().subscribe(products => {

      this.totalRevenue = 0;
      this.cashAmount = 0;

      const map = new Map<string, number>();

      products.forEach(p => {
        const price = Number(p.price);
        const qty = Number(p.quantity ?? 1);

        this.totalRevenue += price * qty;
        this.cashAmount += price * qty;

        map.set(p.name, (map.get(p.name) || 0) + qty);
      });

      // TOP 5
      this.topProducts = Array.from(map.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTimeout(() => this.renderChart(), 0);
    });
  }

  renderChart() {
  this.revenueChart?.destroy();

  const canvas = document.getElementById('revenueChart') as HTMLCanvasElement;
  if (!canvas) return;

  this.revenueChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
      datasets: [{
        label: 'Doanh thu',
        data: [15, 18, 22, 28, 35, 50, 45],
        backgroundColor: '#3b82f6',
        borderRadius: 8
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const value = Number(ctx.raw) * 1000;
              return value.toLocaleString('vi-VN') + ' đ';
            }
          }
        }
      },
      scales: {
        y: {
          ticks: {
            callback: (value) =>
              (Number(value) * 1000).toLocaleString('vi-VN') + ' đ'
          }
        }
      }
    }
  });
}

}
