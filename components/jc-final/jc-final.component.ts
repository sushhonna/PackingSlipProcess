import {
  Component,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  ElementRef
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Sort } from '@angular/material/sort';
import { FormGroup, FormBuilder, FormArray, Validators } from '@angular/forms';
import { Observable, Subscription, forkJoin } from 'rxjs';
import { map, startWith, elementAt } from 'rxjs/operators';
import { JobV2 } from 'src/app/shared/business-objects/job-v2';
import { EstimateType } from 'src/app/shared/business-objects/estimate-type';
import { Employee } from 'src/app/shared/business-objects/employee';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';
import { Store } from 'src/app/shared/business-objects/store';
import { StoreDetails } from 'src/app/shared/business-objects/store-details';
import { Endpoints } from 'src/app/shared/endpoints';
import { Constants } from 'src/app/shared/constants';
import {
  JobCodes,
  JobCodesSubimission
} from 'src/app/shared/business-objects/job-codes';
import { Router } from '@angular/router';
import { JobCode } from 'src/app/shared/business-objects/jobCode';
import { LoginState } from 'src/app/shared/state/login.state';
import { SharedState } from 'src/app/shared/state/shared.state';
import { JobState } from 'src/app/shared/state/job.state';
import { EventService } from 'src/app/shared/services/event.service';
import { AuthState } from 'src/app/shared/state/auth.state';
import { MatDialog } from '@angular/material/dialog';
import { AddMultipleJobCodesDialogComponent } from './add-multiple-job-codes-dialog/add-multiple-job-codes-dialog.component';
import { CloseScrollStrategy } from '@angular/cdk/overlay';
import { BundleCodes } from 'src/app/shared/business-objects/bundle-codes';

@Component({
  selector: 'app-jc-final',
  templateUrl: './jc-final.component.html',
  styleUrls: ['./jc-final.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class JcFinalComponent implements OnInit {
  @ViewChild('shopRepairComment', { static: true }) shopRepairCommentField: ElementRef;
  @ViewChild('emptyCodeId', { static: true }) emptyCodeIdField: ElementRef;
  @ViewChild('codeFieldSelectId', { static: true }) codeFieldSelect: ElementRef;
  shipToStore: Store;
  storeDetails: StoreDetails;
  displayedColumns: string[] = [
    'code',
    'qty',
    'description',
    'cost',
    'charge',
    'employee',
    'actions'
  ];
  displayedPrevColumns: string[] = [
    'code',
    'qty',
    'description',
    'cost',
    'charge',
    'employee'
  ];
  dataSource: FormGroup[] = [];
  dataSourceCopy: FormGroup[] = [];
  noWorkDone = false;
  noWorkDonedeletebtn : boolean = true;
  noWorkDoneDisableFieldRow : boolean = true;
  userInfo: Employee;
  featureToggleIf : boolean;
  currentSortColumn = 'none';
  sortDirection = true;
  isEditEstimate = true;
  totalCost = 0;
  previousWorkCodes: JobCode[] = [];
  filteredOptions: Observable<JobCodes[]>;
  filteredEmployees: Observable<Employee[]>;
  hasShipTo = false;
  continueClicked = false;
  jobData: JobV2;
  jobCodes: JobCodes[];
  jobCodesFiltered: JobCodes[] = [];
  jobsForm: FormGroup;
  shopNo: number;
  estimateTypes: EstimateType[] = [
    { name: 'Estimate', id: 'ESTIMATE' },
    { name: 'Priority Response', id: 'PRIORITY' },
    { name: 'Additional Work', id: 'ADDITIONAL' }
  ];
  employees: Employee[] = [];
  subscriptions: Subscription[] = [];
  disableSubmit: boolean = false;
  emptyFieldsError = false;
  emptyFieldsErrorMsg =
    Constants.ERROR_MESSAGES.JOB_COMPLETION.REQUIRED_FIELD_ERROR;
  showHideAddCodeBtn: boolean = true;
  showHideAddNewRow: boolean = false;
  readOnlyShipToStore: boolean = false;
  invalidShipTo = false;
  errorMessages = Constants.ERROR_MESSAGES;
  isDr = false;
  isWip2 = false;
  isSma = false;
  isSmc = false;
  shopNu: number;
  onChangeValue: string;
  touchedError : boolean = true;
  invalidEmpNo: boolean= false;

  typeAheadCodes: JobCodes[] = [];
	typeAheadEmp: Employee[] = [];

  getAllBundlesData: BundleCodes[];
  bundleJobCodesIf : boolean;
  bundleCodes= [];
  bundleCodesForm: FormGroup;
  bundleCodesData: FormGroup[] = [];
  bundleCodeCheckList= [];
  enableBundleLink: boolean= false;
  displayBundleFlyout: boolean= false;

  constructor(
    private jobCompletionState: JobCompletionState,
    private formBuilder: FormBuilder,
    private router: Router,
    private loginState: LoginState,
    private jobState: JobState,
    private messageBar: MatSnackBar,
    private sharedState: SharedState,
    private eventService: EventService,
    private authState: AuthState,
    private dialog: MatDialog
  ) {
    this.loginState.$dsc.subscribe(shopNu => (this.shopNu = shopNu));
  }

  ngOnInit() {
    let startTime = new Date();
    this.featureToggleIf = this.authState.hasFeature('no-work');
    this.bundleJobCodesIf = this.authState.hasFeature('bundle-job-codes');
    this.initalizeComponent();
    this.checkShop(this.shopNu);
    this.blankRow(null);
    let endTime = new Date();
    this.eventService.createPageLoadEvent('PAGE_LOAD_TIME', 'Job Codes Finalise', startTime, endTime, null).subscribe();
  }


  initalizeComponent() {
    this.getJobCodes();
    this.getEmployees();
    this.initalizeJobsForm();
    this.fetchJobData();
    this.getBundleCodes();
    this.shopRepairCommentField.nativeElement.focus();
  }

  initalizeJobsForm(): void {
    this.jobsForm = this.formBuilder.group({
      shipToStore: ['', Validators.required],
      shopComment: ['' /*, Validators.required*/],
      employeeNumber: [''],
      unitCost: [''], //added
      jobId: ['']
    });
  }

  getBreadCrumbTitles(): string[] {
    return [
      'Job Completion',
      'Scan Identification Tags',
      'Take Photos',
      'Update Job Codes'
    ];
  }

  getBreadCrumbLinks(): string[] {
    return [
      '/job-completion/lookup',
      '/job-completion/lookup/scan-details',
      '/job-completion/lookup/photography'
    ];
  }

  shipToPopulated(): boolean {
    return this.jobsForm.get('shipToStore').value !== '';
  }

  fetchJobData(): void {
    this.jobData = this.jobCompletionState.jobDetails$;
    if (this.jobData) {
      this.jobsForm.get('shopComment').setValue(this.jobData.shopComment);
      this.jobCodes = this.jobCompletionState.jobCodes$;
      this.storeDetails = this.jobCompletionState.storeDetails$;
      this.shipToStore = this.jobCompletionState.getShipToStore();
      if (this.shipToStore) {
        this.jobCompletionState.$assignedStores.subscribe(() => {
          if (this.jobCompletionState.assignedStores$.length > 0) {
            if (
              !this.jobCompletionState.isAssignedStore(
                this.shipToStore.storeNo,
                this.shipToStore.division
              )
            ) {
              this.shipToStore.ticketColor = '#000000';
            }
          }
        });
      }
      if (this.storeDetails) {
        this.jobsForm.get('shipToStore').setValue(this.shipToStore.storeNo);
        this.storeDetails.logo = this.getBrandLogo(this.shipToStore);
      }
      this.formatTableData();
    }
  }

  validateStoreDetails(storeNo: string) {
    const storeNumber = parseInt(storeNo);
    this.jobCompletionState
      .fetchStoreDetails(storeNumber, this.shipToStore.division)
      .subscribe(
        resp => {
          if (resp) {
            this.invalidShipTo = false;
            this.getStoreDetailsOnJobCompletion(storeNo, resp);
          } else {
            this.invalidShipTo = true;
          }
        },
        () => {
          this.invalidShipTo = true;
        }
      );
  }

  getStoreDetailsOnJobCompletion(storeNo: string, res: StoreDetails) {
    const storeNumber = parseInt(storeNo);
    this.storeDetails = res;
    this.shipToStore.brand.name = this.storeDetails.logo;

    if (this.jobCompletionState.assignedStores$.length > 0) {
      const index = this.jobCompletionState.assignedStores$.findIndex(
        store => store.storeNo === storeNumber
      );
      if (index > -1) {
        const assignedStore = this.jobCompletionState.assignedStores$[index];

        if (this.storeDetails) {
          this.jobsForm.get('shipToStore').setValue(this.storeDetails.store);
          this.shipToStore.ticketColor = assignedStore.ticketColor;
          this.storeDetails.logo = this.getBrandLogo(this.shipToStore);
        }
      } else {
        this.shipToStore.ticketColor = '#000000';
        this.storeDetails.logo = this.getBrandLogo(this.shipToStore);
      }
    }
  }

  getBrandLogo(store: Store): string {
    let brandLogo: string = Endpoints.ZALES_LOGO;
    if (store.division === Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) {
      if (
        store.brand.name.indexOf(
          Constants.BRAND_NAME.BRAND_LOGO.JARED_BRAND
        ) !== -1
      ) {
        brandLogo = Endpoints.JARED_LOGO;
      } else if (
        store.brand.name.indexOf(Constants.BRAND_NAME.BRAND_LOGO.KAY_BRAND) !==
        -1
      ) {
        brandLogo = Endpoints.KAY_LOGO;
      } else {
        brandLogo = Endpoints.STERLING_LOGO;
      }
    }
    return brandLogo;
  }

  formatTableData(): void {
    const jobsArray = new FormArray([]);

    if (this.jobData.jobCodes) {
      this.jobData.jobCodes.forEach(job => {
        const empNo = (job.employeeNumber=== 0 ? '' : job.employeeNumber +' - '+ job.employeeName);
        const formGroup1 = this.formBuilder.group({
          code: [job.jobCode, Validators.required],
          qty: [
            job.qty,
            [Validators.required, Validators.pattern(/^-?(0|[1-9]\d*)?$/)]
          ],
          unitCost: [
            job.cost.toFixed(2),
            [
              Validators.required,
              Validators.pattern(/^-?[0-9]{1,6}?(\.[0-9]{0,2})?$/)
            ]
          ],
          description: job.description,
          readOnly: true,
          credit: false,
          editable: true,
          employeeNumber: [empNo
          ,
            Validators.required
          ],
          prevCode: job.jobCode
        });
        if (job != null && job != undefined) {
          this.checkForWarranty(job.jobCode, formGroup1, false, null);
        }
        jobsArray.push(formGroup1);
        this.totalCost += job.cost * job.qty;
      });
      this.jobsForm.addControl('jobCodes', jobsArray);

      if (
          ((this.jobData.status === Constants.STATUS.SC_SHIPPED) &&
          this.jobData.stores &&
          this.jobData.stores[0] &&
          this.jobData.stores[0].division ===
          Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) ||
        (this.jobData.status === Constants.STATUS.MODEL_REJECTED &&
          this.jobData.eRepairJobInformation) ||
        (this.jobData.status === Constants.STATUS.STORE_RECEIVED &&
          this.jobData.stores &&
          this.jobData.stores[0] &&
          this.jobData.stores[0].division ===
          Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) ||
        ((this.jobData.status === Constants.STATUS.CUSTOMER_PICKUP) &&
          this.jobData.stores &&
          this.jobData.stores[0] &&
          this.jobData.stores[0].division ===
          Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND)
      ) {
        if (this.displayedColumns.indexOf('credit') === -1) {
          this.displayedColumns.splice(5, 0, 'credit');
        }
      }
      this.dataSource = (<FormArray>this.jobsForm.get('jobCodes'))
        .controls as FormGroup[];
      if (this.jobData.status === Constants.STATUS.SC_SHIPPED ||
        this.jobData.status === Constants.STATUS.STORE_RECEIVED) {
        this.previousWorkCodes = this.jobData.jobCodes;
        this.readOnlyShipToStore = true;
      }
    }
  }

  setFirstItem(element: FormGroup, event:any): void {
    const fieldValue = element.get(`code`).value;
    const origFieldval = element.get(`prevCode`).value;
    if (fieldValue !== '') {
      const filteredValues = this.jobCodesFiltered.filter(code => {
        return code.code.toString().indexOf(fieldValue) > -1;
      });
      const firstFilteredValue =
        filteredValues.length > 0 ? filteredValues[0].code : fieldValue;
      element.get(`code`).setValue(firstFilteredValue);
      
      let setEditFilterValue;
      let fieldCostValue = "";
      if (origFieldval === fieldValue) {
         setEditFilterValue = filteredValues.findIndex(val => (val.readOnly == false && val.shopCharge == 0));
         fieldCostValue = element.get(`unitCost`).value;
      }
      
      let editFilterValue = (setEditFilterValue != 0 ? this.setCost(element) : fieldCostValue );

      if (filteredValues.length > 0 && editFilterValue == "") {
        this.setCost(element);
        this.disableSubmit = false ;
      }
    }
    if (fieldValue == '') {
      return element.get(`code`).setValue(fieldValue);
    }
  }

  filterJobcodes(val: string): void {
    this.jobCodesFiltered = this.jobCodes.filter(jc => {
      return jc.code.toString().indexOf(val) === 0;
    });
  }

  checkForWarranty(
    jobCode: number,
    formGroup1: FormGroup,
    showMessage: boolean,
    job: JobCodes
  ): void {
    if (
      this.shipToStore.division === Constants.BRAND_NAME.BRAND_LOGO.ZALE_BRAND
    ) {
      this.showHideAddNewRow = false;
      if (this.jobData.jpp && this.jobData.warranty !== 'NO') {
        this.subscriptions.push(
          this.jobCompletionState.checkForWarranty(jobCode, this.jobData.esaPlanType, this.jobData.engravingAlreadyExists).subscribe(resp => {
            this.fieldsEditable(formGroup1, resp, showMessage, job);
            if(resp){
              this.showHideAddNewRow = true;
              this.blankRow(formGroup1);
            }
          })
        );
      } else if (this.jobData.jpp && this.jobData.warranty === 'NO') {
        this.subscriptions.push(
          this.jobCompletionState.checkForJPP(jobCode, this.jobData.esaPlanType, this.jobData.engravingAlreadyExists).subscribe(resp => {
            this.fieldsEditable(formGroup1, resp, showMessage, job);
            if(resp){
              this.showHideAddNewRow = true;
              this.blankRow(formGroup1);
            }
          })
        );
      } else if (!this.jobData.jpp && this.jobData.warranty !== 'NO') {
        this.subscriptions.push(
          this.jobCompletionState.warrantyCheck(jobCode).subscribe(resp => {
            this.fieldsEditable(formGroup1, resp, showMessage, job);
            if(resp){
              this.showHideAddNewRow = true;
              this.blankRow(formGroup1);
            }
          })
        );
      } else {
        this.fieldsEditable(formGroup1, false, showMessage, job);
        this.showHideAddCodeBtn = false;
      }
    } else {
      if (
        this.jobCodes &&
        this.jobCodes.filter(jc => jc.code === jobCode).length > 0
      ) {
        this.setReadonly(
          formGroup1,
          !this.jobCodes.filter(jc => jc.code === jobCode)[0].readOnly,
          job
        );
      }
    }
  }

  setReadonly(formGroup: FormGroup, readOnly: boolean, job: JobCodes): void {
    formGroup.get('readOnly').setValue(readOnly ? false : true);

    if (job) {
      this.fillJobCodeDetails(formGroup, job);
    }
  }

  fieldsEditable(
    formGroup: FormGroup,
    editable: boolean,
    showMessage: boolean,
    job: JobCodes
  ): void {
    formGroup.get('editable').setValue(editable);

    if (editable && formGroup.get('description').value.indexOf('MISC') !== -1) {
      formGroup.get('readOnly').setValue(false);
    }

    if (!editable && showMessage) {
      this.messageBar.open(
        Constants.ERROR_MESSAGES.JOB_COMPLETION.JOB_CODES_ERROR,
        '',
        {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        }
      );
      formGroup.get('qty').setValue('');	
      formGroup.get('employeeNumber').setValue('');	
    }

    if (job) {
      this.fillJobCodeDetails(formGroup, job);
    }
  }

  fillJobCodeDetails(formGroup: FormGroup, job: JobCodes): void {
    if (job && formGroup.get('editable').value) {
      formGroup.get('code').setValue(job.code);
      formGroup.get('prevCode').setValue(job.code);
      formGroup.get('description').setValue(job.description);
      formGroup.get('unitCost').setValue(job.shopCharge.toFixed(2));
      formGroup.get('readOnly').setValue(job.readOnly);
    } else {
      formGroup.get('code').setValue(formGroup.get('prevCode').value);
      formGroup.get('editable').setValue(true);
    }
    this.disableSubmit = false;
    this.checkFor430JobCode();
  }

  setCost(formGroup: FormGroup): void {
    const job = this.jobCodes.find(
      jobCode => jobCode.code === Number(formGroup.get(`code`).value)
    );
    if(job != null && job != undefined) {
      this.checkForWarranty(job.code, formGroup, true, job)
    };
  }

  checkFor430JobCode(): void {
    if (
      this.dataSource.length > 2 &&
      this.dataSource.findIndex(job => job.value.code === 430) > -1
    ) {
      this.disableSubmit = true;
    }
  }

  setQtyEmpValue(formGroup: FormGroup) : void {
    const enteredCode = formGroup.get('code').value;
    const invalidCode = this.jobCodesFiltered.find(res => res.code == enteredCode);
    if(enteredCode !== '' && invalidCode ){
      formGroup.get('qty').patchValue(1);
      const onEmpChangeValue = this.dataSource[0].get('employeeNumber').value;
      formGroup.get('employeeNumber').patchValue(onEmpChangeValue);
    }
  }

  blankRow(element: FormGroup): void{
    this.noWorkDone = false;
    this.noWorkDonedeletebtn = true;
    this.noWorkDoneDisableFieldRow = false;
    this.displayBundleFlyout = false;

    const data = [...this.dataSource];
    const tableData = data.findIndex(res=>res.get('code').value == '');
    const tableEmpData = data.findIndex(res=>res.get('employeeNumber').value == '');
    const Code430Data = data.findIndex(res=>res.get('code').value == 430);

    if(Code430Data > -1 && tableEmpData == -1 && data.length == 1){
      this.noWorkDonedeletebtn = false;
      this.noWorkDone = true;
      this.noWorkDoneDisableFieldRow = true;
    }
    if(this.shipToStore.division === Constants.BRAND_NAME.BRAND_LOGO.ZALE_BRAND){
          if(this.showHideAddNewRow && tableData == -1){
            this.addJob(element);
          }
    }
    else if(this.showHideAddCodeBtn && tableData == -1){
      this.addJob(element);
    }
  }

  addJob(element: FormGroup): void {
    if (this.noWorkDone) {
      return;
    }
    const formGroup = this.formBuilder.group({
      code: ['', Validators.required],
      qty: ['', [Validators.required, Validators.pattern(/^-?(0|[1-9]\d*)?$/)]],
      unitCost: [
        '',
        [
          Validators.required,
          Validators.pattern(/^-?[0-9]{1,6}?(\.[0-9]{0,2})?$/)
        ]
      ],
      description: '',
      readOnly: true,
      editable: true,
      credit: '',
      employeeNumber: ['', Validators.required],
      prevCode: ''
    });

    var setEmployeeData = true;
    if (
      ((this.jobData.status === Constants.STATUS.SC_SHIPPED) &&
        this.jobData.stores &&
        this.jobData.stores[0] &&
        this.jobData.stores[0].division ===
        Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) ||
      (this.jobData.status === Constants.STATUS.MODEL_REJECTED &&
        this.jobData.eRepairJobInformation) ||
      (this.jobData.status === Constants.STATUS.STORE_RECEIVED &&
        this.jobData.stores &&
        this.jobData.stores[0] &&
        this.jobData.stores[0].division ===
        Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) ||
      ((this.jobData.status === Constants.STATUS.CUSTOMER_PICKUP) &&
        this.jobData.stores &&
        this.jobData.stores[0] &&
        this.jobData.stores[0].division ===
        Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND)
    ) {
      setEmployeeData = false;
    }
    
    this.dataSource = [...this.dataSource, formGroup];
    setTimeout(() => {
      const rows = document.querySelectorAll('#jobTable tr');

      if (
        document.getElementsByName('code' + (this.dataSource.length - 1))[0]
      ) {
        if(element) {
          document.getElementsByName('qty' + (this.dataSource.length - 2))[0].focus();
        }else {
          document
          .getElementsByName('code' + (this.dataSource.length - 1))[0]
          .focus();
        }
      }
      rows[rows.length - 5].scrollIntoView();
    }, 200);

    this.checkBundles();
  }

  removeJob(index: number): void {
    const data = [...this.dataSource];
    data.splice(index, 1);
    this.dataSource = data;
    this.getTotalCost();
    this.disableSubmit = false;
    this.checkFor430JobCode();
    this.checkBundles();
  }

  removeAllJobs(){
    this.dataSource = [];
    this.addJob(null);
  }

  updateCost(index: number): void {
    const formGroup = this.dataSource[index];
    formGroup.get('unitCost').setValue(-formGroup.get('unitCost').value);
    this.getTotalCost();
  }

  getLineCharges(formGroup: FormGroup): number {
    return formGroup.get('unitCost').value * formGroup.get('qty').value;
  }

  getTotalCost(job?: FormGroup): void {
    let totalCost = 0;
    if (this.dataSource) {
      this.dataSource.forEach(job => {
        totalCost += job.get('unitCost').value * job.get('qty').value;
      });
    }
    this.totalCost = totalCost;

    if (job && job.get('code').value === 430 && job.get('qty').value > 1) {
      this.disableSubmit = true;
    }
  }

  addImagesToJob(): Observable<{}> {
    const res = this.jobCompletionState.jobPhotos$;
    const imagesSubs = [];
    res.forEach(image => {
      imagesSubs.push(
        this.jobState.addImageToQueue(
          this.jobCompletionState.jobDetails$.signetJobId,
          image
        )
      );
    });

    return forkJoin(imagesSubs);
  }

  submitJobs(): void {
    if(this.invalidEmpNo) {
      return;
    }
    this.invalidEmpNo = false;
    this.continueClicked = true;
    if (this.jobsForm.get('shipToStore').value !== '') {
      this.hasShipTo = true;
    }

    this.bundleCodeCheckList.forEach(bundleCode => {
      this.dataSource.forEach((value,index) => {
        if(value.get('code').value === bundleCode.code) {
          this.dataSource.splice(index, 1);
        }
      })
    })
    
    const data = this.dataSource
      .map((job: FormGroup) => {
        const submitJob = job.value;
        if(job.get('unitCost').value==0 && !job.get('readOnly').value)
                {
                  job.get('unitCost').setErrors({ invalid: true });
                  submitJob.valid = false;
                }else{
                  job.statusChanges.subscribe(res=>{
                    if(res == "VALID"){
                      this.emptyFieldsError = false; 
                    }
                  })
                  submitJob.valid = job.valid;
                }
        delete submitJob.readOnly;
        delete submitJob.credit;
        delete submitJob.editable;
        delete submitJob.prevCode;
        return submitJob;
      })
      .filter((job: JobCodes) => {
        return job.valid;
      })
      .map((job: JobCodes) => {
        delete job.valid;
        job.employeeNumber = parseInt(
          job.employeeNumber
            .toString()
            .split('-')[0]
            .trim()
        );
        return job;
      });

    if (data.length > 0 && (this.dataSource.length == data.length || this.dataSource.length == data.length+1)) {
      const request: JobCodesSubimission = {
        jobCodes: [...data],
        shipTo: {
          storeNumber: this.jobsForm.get('shipToStore').value,
          division: this.shipToStore.division
        },
        shopComment: this.jobsForm.value.shopComment
      };
      this.jobCompletionState
        .submitJobs(request, this.jobData.signetJobId, this.shopNo)
        .subscribe(() => {
          this.isEditEstimate = false;
          this.jobCompletionState.jobCompleteMsg$ = Constants.DISPLAY_MESSAGES.JOBCOMPLETION.JOB_COMPLETION_MSG(
            this.jobData.divisionJobNumber
          );
          this.eventService.completeEvent('job-completion', {jobNumber: this.jobData.divisionJobNumber}, null).subscribe();

          if (this.jobCompletionState.jobPhotos$.length === 0) {
            this.router.navigateByUrl('/job-completion/lookup');
          } else {
            this.addImagesToJob().subscribe(() => {
              this.router.navigateByUrl('/job-completion/lookup');
            });
          }
        });
    } else {
      this.emptyFieldsError = true;
      this.dataSource.forEach(job => {
              if(job.get('description').value == '' && job.get('code').value == ''){
                job.get('code').markAsUntouched();
                job.get('unitCost').markAsUntouched();
                job.get('qty').markAsUntouched();
                job.get('employeeNumber').markAsUntouched(); 
              }else{
                this.touchedError = false;
                job.get('code').markAsTouched();
                job.get('unitCost').markAsTouched();
                job.get('qty').markAsTouched();
                job.get('employeeNumber').markAsTouched();
              }
      });
    }
  }

  getJobCodes(): void {
    const newSubs: Subscription[] = [
      this.loginState.$dsc.subscribe(shopNo => (this.shopNo = shopNo)),
      this.jobCompletionState.$jobCodes.subscribe(res => {
        this.jobCodes = res;
        this.jobCodesFiltered = res;
      })
    ];
    this.subscriptions.push(...newSubs);
  }

  getEmployees(): void {
    this.jobCompletionState.getEmployees(this.shopNo);
    this.subscriptions.push(
      this.jobCompletionState.$employees.subscribe(res => {
        this.employees = res;
      })
    );
  }

  noWorkDoneChange(element : FormGroup) {
    this.noWorkDonedeletebtn = true;
    this.noWorkDoneDisableFieldRow = false;
    if (this.noWorkDone) {
    if (this.dataSourceCopy && !this.dataSourceCopy.length) {
      this.dataSourceCopy = this.dataSource.slice();
    }
      this.dataSource = [];
      this.addNoChargeDataToDataSource();
    }
    else if(!this.noWorkDone && this.dataSource.length == 0){
      this.noWorkDoneDisableFieldRow = false;
      this.addJob(element);
    }
    else {
      this.dataSource = this.dataSourceCopy.slice();
      this.blankRow(element);
    }
  }

  addNoChargeDataToDataSource() {
    this.loginState.$userInfo.subscribe(
      userInfo => (this.userInfo = userInfo)
    )
    const empName = this.userInfo.employeeId + ' - ' + this.userInfo.firstName + ' ' + this.userInfo.lastName;
    if (this.jobData && this.jobData.jobCodes) {
      const job = this.jobCodes.find((job) => job.code === 430);

      const formGroup = this.formBuilder.group({
        code: [job.code, Validators.required],
        qty: [1, [Validators.required, Validators.pattern(/^-?(0|[1-9]\d*)?$/)]],
        unitCost: [
          0,
          [
            Validators.required,
            Validators.pattern(/^-?[0-9]{1,6}?(\.[0-9]{0,2})?$/)
          ]
        ],
        description: job.description,
        readOnly: true,
        editable: true,
        credit: '',
        employeeNumber: ['', Validators.required],
        prevCode: ''
      });
      this.dataSource.push(formGroup);
      this.noWorkDonedeletebtn = false;
      this.noWorkDoneDisableFieldRow = true;
    }
  }

  onTab(formGroup: FormGroup): void {
      return formGroup.get('employeeNumber').value == '0 - null' ? formGroup.get('employeeNumber').setValue('') : formGroup.get('employeeNumber').value ;
   }

  isFiltered(employee: Employee, value): boolean {
    const emp =
      employee.employeeId +
      ' - ' +
      employee.firstName +
      ' ' +
      employee.lastName;
    return emp.includes(value);
  }

  sortIndicator(source: string): string {
    if (source === this.currentSortColumn) {
      return 'z';
    } else {
      return 'T';
    }
  }

  sortTable(sort: Sort): number {
    const data = this.dataSource.slice();
    if (!sort.active || sort.direction === '') {
      this.currentSortColumn = 'none';
      return;
    }

    this.dataSource = data.sort((a, b) => {
      const ascending = sort.direction === 'asc';
      this.sortDirection = !!ascending;
      switch (sort.active) {
        case 'code':
          this.currentSortColumn = 'code';
          return this.compareToSort(a.value.code, b.value.code, ascending);
        case 'qty':
          this.currentSortColumn = 'qty';
          return this.compareToSort(a.value.qty, b.value.qty, ascending);
        case 'description':
          this.currentSortColumn = 'description';
          return this.compareToSort(
            a.value.description,
            b.value.description,
            ascending
          );
        case 'cost':
          this.currentSortColumn = 'cost';
          return this.compareToSort(
            parseFloat(Number(a.value.unitCost).toFixed(2)),
            parseFloat(Number(b.value.unitCost).toFixed(2)),
            ascending
          );
        case 'charge':
          this.currentSortColumn = 'charge';
          return this.compareToSort(
            parseFloat(Number(a.value.charge).toFixed(2)),
            parseFloat(Number(b.value.charge).toFixed(2)),
            ascending
          );
        case 'credit':
          this.currentSortColumn = 'credit';
          return this.compareToSort(a.value.credit, b.value.credit, ascending);
        case 'employee':
          this.currentSortColumn = 'employee';
          return this.compareToSort(
            a.value.employeeNumber,
            b.value.employeeNumber,
            ascending
          );
        default:
          return 0;
      }
    });
  }

  validateInputStoreNumber(storeNo: string) {
    const storeNumber = parseInt(storeNo);
    let regexStr = '^[0-9]*$';
    if (!RegExp(regexStr).test(storeNo)) {
      this.jobsForm.get('shipToStore').setValue('');
    }
  }

  compareToSort(
    a: number | string | boolean | Date,
    b: number | string | boolean | Date,
    ascending: boolean
  ): number {
    return (a < b ? -1 : 1) * (ascending ? 1 : -1);
  }

  /* Method which allow numbers only */
  numberOnly(event: KeyboardEvent): boolean {
    return this.sharedState.numberOnly(event);
  }

  /* Method which allow amount format only */
  amountOnly(event: KeyboardEvent): boolean {
    return this.sharedState.amountOnly(event);
  }

  goBack(): void {
    if (this.jobData.chainTagNo) {
      this.jobCompletionState.currentProgressStep = 2;
      this.router.navigateByUrl('/job-completion/lookup');
    } else {
      this.router.navigateByUrl('/job-completion/lookup');
    }
  }

  appendCents(formGroup: FormGroup): void {
    const val = isNaN(Number(formGroup.get('unitCost').value))
      ? ''
      : Number(formGroup.get('unitCost').value).toFixed(2);
    formGroup.get('unitCost').setValue(val);
  }

  checkShop(shopNu: number): void {
    if (shopNu === Constants.SERVICE_CENTER_SHOP_NOS.WIP2) {
      this.isWip2 = true;
    } else if (shopNu === Constants.SERVICE_CENTER_SHOP_NOS.DR) {
      this.isDr = true;
    } else if (shopNu === Constants.SERVICE_CENTER_SHOP_NOS.SMA) {
      this.isSma = true;
    } else if (shopNu === Constants.SERVICE_CENTER_SHOP_NOS.SMC) {
      this.isSmc = true;
    }
  }

  validateQty(formGroup: FormGroup): void {
    let qty = formGroup.get('qty').value.toString().trim();

    if(qty<=0){
      formGroup.get('qty').setErrors({ invalid: true });
    }
  }

  validateJobCode(formGroup: FormGroup): void {
    let code = formGroup.get('code').value.toString().trim();
    if (this.jobCodes.findIndex(job => job.code == code) === -1) { 
      formGroup.get('code').setErrors({ invalid: true }); 
    }
  }

  validateUnitCost(formGroup: FormGroup): void {
    let unitCost = formGroup.get('unitCost').value.toString().trim();

    if(unitCost=0){
      formGroup.get('unitCost').setErrors({ invalid: true });
    }
  }

  validateEmpNo(empNo) {
    const number = empNo.toString().split('-')[0].trim();
    if(!isNaN(number) && number.length > 9) {
      this.invalidEmpNo = true;
    } else {
      this.invalidEmpNo = false;
    }
  }

  validateEmployee(formGroup: FormGroup): void {
    const employeeNumber = formGroup
      .get('employeeNumber')
      .value.toString()
      .split('-')[0]
      .trim();
    if (!isNaN(parseInt(employeeNumber))) {
      if (
        this.employees.findIndex(
          employee => employee.employeeId === employeeNumber
        ) === -1
      ) {
        this.jobCompletionState
          .validateEmployee(parseInt(employeeNumber))
          .subscribe(
            resp => {
              if (resp[0]) {
                const emp = resp[0];
                if (this.isWip2 || this.isDr || this.isSma || this.isSmc) {
                  if (emp.employeeStatus === 'ACTIVE') {
                    formGroup
                      .get('employeeNumber')
                      .setValue(
                        `${emp.employeeId} - ${emp.firstName} ${emp.lastName}`
                      );
                  }
                }
                else if (emp.employeeStatus === 'ACTIVE' && emp.fieldEmployee) {
                  formGroup
                    .get('employeeNumber')
                    .setValue(
                      `${emp.employeeId} - ${emp.firstName} ${emp.lastName}`
                    );
                } else {
                  formGroup.get('employeeNumber').setErrors({ invalid: true });
                }
              } else {
                formGroup.get('employeeNumber').setErrors({ invalid: true });
              }
            },
            error => {
              formGroup.get('employeeNumber').setErrors({ invalid: true });
            }
          );
      } else {
        const emp = this.employees.filter(
          employee => employee.employeeId === employeeNumber
        )[0];
        formGroup
          .get('employeeNumber')
          .setValue(`${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
      }
    } else {
      formGroup.get('employeeNumber').setErrors({ invalid: true });
    }
  }

  openPanel(id: string, index: number, listId: string): void {
    document.getElementById(id + index).click();
    document.getElementById(id + index).click();
  }

  codeFilterValues(input: string): void {
    this.typeAheadCodes = [];
    this.typeAheadCodes = this.jobCodesFiltered.filter(code => {
      return (code.code.toString().includes(input) || code.description.toString().includes(input) || code.description.toLowerCase().includes(input));
    });
  }

  empFilterValues(input: string): void {
    this.typeAheadEmp = this.employees.filter(code => {
      return (code.employeeId.toString().includes(input) || code.firstName.toString().includes(input) || code.lastName.toString().includes(input) || code.firstName.toLowerCase().includes(input) || code.lastName.toLowerCase().includes(input));
		});

    this.validateEmpNo(input);
  }

  empName(formGroup: FormGroup){
    this.dataSource.forEach(job => {
       return (job.get('employeeNumber').value == '' && job.get('code').value !== '')  ? job.get('employeeNumber').setValue(formGroup.get('employeeNumber').value) : job.get('employeeNumber').value;
    });
  }

  submitFocus(element){
    if(element.get('code').value == ''){
      this.emptyCodeIdField.nativeElement.focus();
    }
  }

  getBundleCodes() {
    this.jobCompletionState.getAllBundles().subscribe(data => {
      this.getAllBundlesData = data;
      this.displayBundleFlyout = true;

      this.dataSource.forEach(job => {
        this.getAllBundlesData.forEach(bundle => {
          if(job.get('code').value === bundle.jobCode) {
            this.bundleCodeCheckList.push(job.value);
          }
        })
      })

      this.getAllBundlesData.forEach(bundleCode => {
        this.jobCodesFiltered.forEach((value,index) => {
          if(bundleCode.jobCode === value.code) {
            this.jobCodesFiltered.splice(index, 1);
          }
        })
      });

      this.checkBundles();
    })
  }

  checkBundles() {
    this.enableBundleLink = false;

    if(this.bundleCodeCheckList.length > 0) {
      this.enableBundleLink = true;

      const data = [...this.dataSource];
      this.bundleCodeCheckList.forEach(bundleCode => {
        data.forEach((value,index) => {
          if(value.get('code').value === bundleCode.code) {
            data.splice(index, 1);
          }
        })
      })
      this.dataSource = data;

      this.addMultipleCodes(this.displayBundleFlyout);
    } else {
      this.displayBundleFlyout = false;
    }
  }

  addMultipleCodes(displayBundleFlyout){
    if(!displayBundleFlyout) {
      return;
    }

    const existingCodes = [];
    this.dataSource.forEach(row => {
      if(row.get('code').value) {
        existingCodes.push(row.value);
      }
    })

    let dialogRef = this.dialog.open(AddMultipleJobCodesDialogComponent, {
     panelClass: 'custom-dialog-container',
     data: {
      existingCodes: existingCodes,
      bundleCode: this.bundleCodeCheckList[0]
    }
    })
    dialogRef.afterClosed().subscribe((result) => {
      this.bundleCodes = [];
      if(result) {
        this.bundleCodes = result;
        this.displayBundleFlyout = false;
        this.bundleCodeFormInitialize();
        this.mapBunleCodes();
      }
    })
  }

  mapBunleCodes() {
    const bundleCodesArray = new FormArray([]);

    if (this.bundleCodes) {
      this.bundleCodes.forEach(job => {
        const formGroup2 = this.formBuilder.group({
          code: [job.code, Validators.required],
          qty: [1, [Validators.required, Validators.pattern(/^-?(0|[1-9]\d*)?$/)]],
          unitCost: [job.shopCharge,
            [
              Validators.required,
              Validators.pattern(/^-?[0-9]{1,6}?(\.[0-9]{0,2})?$/)
            ]
          ],
          description: job.description,
          readOnly: true,
          credit: false,
          editable: true,
          employeeNumber: [job.employeeNumber, Validators.required],
          prevCode: job.jobCode
        });
        if (job != null && job != undefined) {
          this.checkForWarranty(job.code, formGroup2, false, null);
        }
        bundleCodesArray.push(formGroup2);
      });
      this.bundleCodesForm.addControl('jobCodes', bundleCodesArray);
      this.bundleCodesData = (<FormArray>this.bundleCodesForm.get('jobCodes'))
        .controls as FormGroup[];
      this.dataSource.splice(this.dataSource.findIndex(res=>res.get('code').value == ''),1);
      this.dataSource = [...this.dataSource,...this.bundleCodesData];
      this.addJob(this.dataSource[0]);
      this.codeFieldSelect.nativeElement.focus();
    }
  }

  bundleCodeFormInitialize() {
    this.bundleCodesForm = this.formBuilder.group({
      shipToStore: ['', Validators.required],
      shopComment: ['' /*, Validators.required*/],
      employeeNumber: [''],
      unitCost: [''], //added
      jobId: ['']
    });
  }

}