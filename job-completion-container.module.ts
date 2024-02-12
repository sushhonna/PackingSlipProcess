import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../shared/modules/material-modue';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgxPrintModule } from 'ngx-print';
import { OrderbyStorePipe } from '../../shared/pipes/orderby-store.pipe';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { SharedModule } from 'src/app/shared/shared.module';
import { JobCompletionContainerComponent } from './job-completion-container.component';
import { JobCompletionRoutingModule } from './job-completion-container-routing.module';
import { ScanIdComponent } from './components/scan-id/scan-id.component';
import { JobCompletionLookupComponent } from './components/job-completion-lookup/job-completion-lookup.component';
import { JobCompletionPhotographyComponent } from './components/job-completion-photography/job-completion-photography.component';
import { JcJobDetailsComponent } from './components/jc-job-details/jc-job-details.component';
import { JcFinalComponent } from './components/jc-final/jc-final.component';
import { JcProgressBarComponent } from './components/jc-progress-bar/jc-progress-bar.component';
import { AddMultipleJobCodesDialogComponent } from './components/jc-final/add-multiple-job-codes-dialog/add-multiple-job-codes-dialog.component';
import { AddMultipleCodesConfirmationDialogComponent } from './components/jc-final/add-multiple-job-codes-confirmation-dialog/add-multiple-job-codes-confirmation-dialog.component';

@NgModule({
  declarations: [
    JobCompletionLookupComponent,
    JobCompletionContainerComponent,
    ScanIdComponent,
    JobCompletionPhotographyComponent,
    JcJobDetailsComponent,
    JcFinalComponent,
    JcProgressBarComponent,
    AddMultipleJobCodesDialogComponent,
    AddMultipleCodesConfirmationDialogComponent
  ],
  imports: [
    JobCompletionRoutingModule,
    CommonModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    NgxPrintModule,
    MatInputModule,
    MatTableModule,
    SharedModule,
    MatSnackBarModule
  ],
  providers: [OrderbyStorePipe],
})
export class JobCompletionContainerModule { }
