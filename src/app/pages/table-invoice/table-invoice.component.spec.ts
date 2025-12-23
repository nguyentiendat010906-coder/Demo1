import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableInvoiceComponent } from './table-invoice.component';

describe('TableInvoiceComponent', () => {
  let component: TableInvoiceComponent;
  let fixture: ComponentFixture<TableInvoiceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableInvoiceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableInvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
