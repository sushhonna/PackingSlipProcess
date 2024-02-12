import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-add-multiple-job-codes-confirmation-dialog',
  templateUrl: './add-multiple-job-codes-confirmation-dialog.component.html',
  styleUrls: ['./add-multiple-job-codes-confirmation-dialog.component.scss']
})
export class AddMultipleCodesConfirmationDialogComponent {
  dispUnsavedMsg:string = 'You have unsaved changes. Are you sure you want to leave without saving?';

  constructor(
    public dialogRef: MatDialogRef<AddMultipleCodesConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { }
  ) { dialogRef.disableClose = true; }

  cancelBtn(){
    this.dialogRef.close(false);
  }
  leaveBtn(){
    this.dialogRef.close(true);
  }

}
