import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { JcFinalComponent } from './jc-final.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { Input, Component } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';


@Component({ selector: 'app-jc-job-details', template: '' })
class JobDetailsStubComponent {
  @Input() hideStoreDetails: boolean;
}
describe('JcFinalComponent', () => {
  let component: JcFinalComponent;
  let fixture: ComponentFixture<JcFinalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [JcFinalComponent, JobDetailsStubComponent],
      imports: [
        SharedModule,
        ReactiveFormsModule,
        MatTableModule,
        MatFormFieldModule,
        MatCheckboxModule,
        HttpClientTestingModule,
        RouterTestingModule
      ],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JcFinalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
