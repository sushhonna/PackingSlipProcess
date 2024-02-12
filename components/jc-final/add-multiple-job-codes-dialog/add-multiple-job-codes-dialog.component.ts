import { UniqueSelectionDispatcher } from '@angular/cdk/collections';
import { ThisReceiver } from '@angular/compiler';
import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSort } from '@angular/material/sort';
import { element } from 'protractor';
import { Observable, Subscription } from 'rxjs';
import { BundleCodes, BundleCodesFilter, BundleJobCodes } from 'src/app/shared/business-objects/bundle-codes';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';
import { AddMultipleCodesConfirmationDialogComponent } from '../add-multiple-job-codes-confirmation-dialog/add-multiple-job-codes-confirmation-dialog.component';

@Component({
  selector: 'app-add-multiple-job-codes-dialog',
  templateUrl: './add-multiple-job-codes-dialog.component.html',
  styleUrls: ['./add-multiple-job-codes-dialog.component.scss']
})
export class AddMultipleJobCodesDialogComponent implements OnInit {
  @ViewChild(MatSort) sort: MatSort;

  bundleCodesForm: FormGroup;
  bundleCodes: BundleJobCodes[];
  bundleTypeList: any = null;
  metalTypeList: any = null;
  jewelryTypeList: any = null;
  bundleCodesResponse: any;
  bundleCodesData: any;
  filteredData: BundleCodesFilter[];
  existingJobCodes = [];
  notInTheBundle: BundleCodesFilter[];
  bundleCodesFilteredData: BundleCodesFilter[] = [];
  selectedCodes = [];
  selectedCount = 0;
  jobCodeID = 1170;
  updateBundleResponse: any;
  restrictAPICall: boolean = false;
  buttonLabel = 'Add Codes';
  bundleCode: any;

  constructor(
    private jobCompletionState: JobCompletionState,
    private formBuilder: FormBuilder,
    public dialog: MatDialog,
    public dialogRef: MatDialogRef<AddMultipleJobCodesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.existingJobCodes = data.existingCodes;
    this.bundleCode = data.bundleCode;

    dialogRef.disableClose = true;
    this.dialogRef.backdropClick().subscribe((_) => {
      const dialogRef = this.dialog.open(AddMultipleCodesConfirmationDialogComponent);
      if (this.dialog.open) {
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.dialogRef.close(null);
          }
        })
      }
    });
  }

  ngOnInit(): void {
    this.formInitialization();
    this.mapExistingCodes();

    const payload: any = {
      type: null,
      metalType: null,
      jewelryType: null,
      jobCode: this.bundleCode.code
    };
    this.getBundleCodesData(payload);
    this.getFilterData();
  }

  formInitialization() {
    this.bundleCodesForm = this.formBuilder.group({
      bundleType: [''],
      metalType: [''],
      jewelryType: ['']
    });
  }

  getBundleCodesData(payload) {
    if (this.restrictAPICall) {
      return;
    }

    if(!this.bundleCode) {
      this.jobCompletionState.getAllBundleCodes(payload).subscribe(data => {
        this.bundleCodesData = data[0];
        this.bundleCodes = this.bundleCodesData.jobCodes;
        this.filterBundleCodes();
        this.restrictAPICall = true;
      })
    } else {
      this.jobCompletionState.getBundleCodesData(payload).subscribe(data => {
        this.bundleCodesData = data[0];
        this.bundleCodes = this.bundleCodesData.jobCodes;
        this.filterBundleCodes();
        this.restrictAPICall = true;
      })
    }
  }

  filterBundleCodes() {
    if (this.bundleCodes.length > 0) {
      const data = [];
      this.bundleCodes.forEach(jobCode => {
        if ((data.findIndex(code => code.categoryName === jobCode.category)) < 0) {
          data.push({
            categoryName: jobCode.category,
            filteredJobCodes: [jobCode]
          })
        } else {
          const code = data.find(
            element => (element.categoryName === jobCode.category)
          );
          code.filteredJobCodes.push(jobCode);
        }
      })
      data.sort((a, b) => {
        return this.jobCompletionState.compareToSort(a.categoryName, b.categoryName, true);
      });
      this.filteredData = data;
      this.filteredData.forEach(category => {
        category.filteredJobCodes.forEach(jobCode => {
          jobCode.selected = false;
        })
        category.filteredJobCodes.sort((a, b) => {
          return this.jobCompletionState.compareToSort(a.code, b.code, true);
        });
      })
      this.addValuesToForm();
      this.validatefilteredData();
      this.getNotInBundleCodes();
    }
  }

  addValuesToForm() {
    this.bundleCodesForm.patchValue({
      bundleType: this.bundleCodesData.type,
      metalType: this.bundleCodesData.metalType,
      jewelryType: this.bundleCodesData.jewelryType
    })
  }

  getFilterData() {
    this.jobCompletionState.getBundleTypes().subscribe(resp => {
      this.bundleTypeList = resp;
    });
    this.jobCompletionState.getMetalTypes().subscribe(resp => {
      this.metalTypeList = resp;
    });
    this.jobCompletionState.getJewelryTypes().subscribe(resp => {
      this.jewelryTypeList = resp;
    });
  }

  mapExistingCodes() {
    if (this.existingJobCodes.length > 1) {
      this.buttonLabel = 'Save Changes';
      const existingData = [];
      this.existingJobCodes.sort((a, b) => {
        return this.jobCompletionState.compareToSort(a.code, b.code, true);
      });
      this.existingJobCodes.forEach(row => {
        if (row.code) {
          existingData.push({
            code: row.code,
            description: row.description,
            shopCharge: row.unitCost,
            readOnly: row.readOnly
          })
        }
      })
      this.selectedCodes = existingData;
    }
  }

  getSelectedCount() {
    this.selectedCount = 0;
    this.selectedCodes = [];
    this.filteredData.forEach(category => {
      category.filteredJobCodes.forEach(jobCode => {
        if (jobCode.selected) {
          this.selectedCount++;
          this.selectedCodes.push(jobCode)
        }
      })
    })
  }

  getNotInBundleCodes() {
    if (this.selectedCodes.length > 0) {
      const tempData = [];
      tempData.push({
        categoryName: 'Not in this Bundle',
        filteredJobCodes: this.selectedCodes
      })

      this.notInTheBundle = tempData;

      this.notInTheBundle.forEach(category => {
        category.filteredJobCodes.forEach(jobCode => {
          jobCode.selected = true;
        })
      })
    }

    if (this.notInTheBundle) {
      this.filteredData = this.notInTheBundle.concat(this.filteredData);
    }
    this.getSelectedCount();
  }

  validatefilteredData() {
    if (this.selectedCodes.length > 0) {
      this.filteredData.forEach(category => {
        category.filteredJobCodes.forEach(jobCode => {
          this.selectedCodes.forEach((value, index) => {
            if (value.code === jobCode.code) {
              jobCode.selected = true;
              this.selectedCodes.splice(index, 1);
            }
          })
        })
      })
    }
  }

  updateCodes() {
    let empNo = this.existingJobCodes.length > 0 ? this.existingJobCodes[0].employeeNumber : '';
    this.existingJobCodes.forEach(existingCodes => {
      this.selectedCodes.forEach((value,index) => {
        value.employeeNumber = empNo;
        if(existingCodes.code === value.code) {
          this.selectedCodes.splice(index, 1);
        }
      })
    })

    this.dialogRef.close(this.selectedCodes);
  }

  clearSelection() {
    this.filteredData.forEach(category => {
      category.filteredJobCodes.forEach(jobCode => {
        jobCode.selected = false;
      })
    })
    this.getSelectedCount();
  }

  onChangeSelection(event: MatCheckboxChange, element) {
    if (this.selectedCount >= 12 && event.checked) {
      return;
    }

    this.filteredData.forEach(category => {
      category.filteredJobCodes.forEach(jobCode => {
        if (jobCode.code === element.code) {
          jobCode.selected = event.checked;
        }
      })
    })
    this.getSelectedCount();
  }

  close() {
    if (this.selectedCount > 0) {
      const dialogRef = this.dialog.open(AddMultipleCodesConfirmationDialogComponent);
      if (this.dialog.open) {
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            this.dialogRef.close(null);
          }
        })
      }
    } else {
      this.dialogRef.close(null);
    }
  }

}
