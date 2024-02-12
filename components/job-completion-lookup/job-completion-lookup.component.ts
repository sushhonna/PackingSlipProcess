import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Constants } from 'src/app/shared/constants';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';
import { JobV2 } from 'src/app/shared/business-objects/job-v2';
import { LoginState } from 'src/app/shared/state/login.state';
import { JobSelectionDialogComponent } from 'src/app/components/job-selection-dialog/job-selection-dialog.component';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';
import { JobState } from 'src/app/shared/state/job.state';
import { RecursiveTemplateAstVisitor } from '@angular/compiler';
import { EventService } from 'src/app/shared/services/event.service';
import { AuthService } from 'src/app/shared/authguard/auth.service';
import { AuthState } from 'src/app/shared/state/auth.state';

@Component({
  selector: 'app-job-completion-lookup',
  templateUrl: './job-completion-lookup.component.html',
  styleUrls: ['./job-completion-lookup.component.scss']
})
export class JobCompletionLookupComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput', { static: true }) searchInputField: ElementRef;
  jobNumberForm: FormGroup;
  subscriptions: Subscription[] = [];
  error = '';
  displayMessage = Constants.DISPLAY_MESSAGES;
  jobCompletionMsg = '';
  shopNo: number;
  jobNotInShopError = '';

  constructor(
    private jobCompletionState: JobCompletionState,
    private fb: FormBuilder,
    private router: Router,
    private loginState: LoginState,
    private dialog: MatDialog,
    private authState: AuthState,
    private eventService: EventService
  ) {
    this.loginState.$dsc.subscribe(shopNo => (this.shopNo = shopNo));
  }

  ngOnInit() {
    let startTime = new Date();
    this.cleanState();
    this.handleSubscriptions();
    this.error = '';
    this.buildFormGroup();
    this.focusOnInit();
    this.jobCompletionMsg = this.jobCompletionState.jobCompleteMsg$;
    this.jobCompletionState.jobCompleteMsg$ = '';
    this.searchInputField.nativeElement.focus();
    let endTime = new Date();
    this.eventService.createPageLoadEvent('PAGE_LOAD_TIME', 'Job Completion Lookup', startTime, endTime, null).subscribe();
  }

  handleSubscriptions(): void {
    let subs: Subscription[] = [
      this.loginState.$dsc.subscribe(res => {
        this.shopNo = res;
      })
    ];
    this.subscriptions.push(...subs);
  }

  buildFormGroup() {
    this.jobNumberForm = this.fb.group({
      jobNumber: [
        '',
        [Validators.required, Validators.pattern(/^-?(0|[1-9]\d*)?$/)]
      ]
    });
  }

  cleanState(): void {
    if (this.authState.hasFeature('receive-via-photography')) {
      console.log('===> has feature');
    } else {
      console.log('===> does NOT have feature');
    }
    this.jobCompletionState.jobNumber$ = null;
    this.jobCompletionState.jobDetailsList$ = [];
    this.jobCompletionState.jobCodes$ = [];
    this.jobCompletionState.jobPhotos$ = [];
  }

  submitForm(): void {
    this.cleanState();
    if (!this.jobNumber.errors) {
      this.jobCompletionState.jobDetails$ = null;
      this.jobCompletionState.storeDetails$ = null;
      this.jobCompletionState.jobDetailsList$ = [];
      this.jobCompletionState.jobNumber$ = this.jobNumber.value;
      this.jobCompletionState.fetchJob(this.jobNumber.value, this.shopNo);
      let detailsFetched = false;
      this.subscriptions.push(
        this.jobCompletionState.$jobDetailsList.subscribe(
          () => {
            const jobCompletionData: JobV2[] = this.jobCompletionState
              .jobDetailsList$;
            if (!detailsFetched) {
              if (jobCompletionData && jobCompletionData.length > 0) {
                detailsFetched = true;
                this.eventService.startEvent('FLOW_TRACKING', 'job-completion');
                if (jobCompletionData.length > 1) {
                  const dialogRef: MatDialogRef<
                    JobSelectionDialogComponent
                  > = this.dialog.open(JobSelectionDialogComponent, {
                    data: {
                      jobId: this.jobNumber.value,
                      jobs: jobCompletionData
                    }
                  });
                  this.subscriptions.push(
                    dialogRef.afterClosed().subscribe(result => {
                      if (result) {
                        if (result.shops ? result.shops[0].shopNo === this.shopNo : false) {
                          if (result.status !== Constants.STATUS.SC_ESTIMATE) {
                            this.error = '';
                            this.navigateToJobCompletionPage(result);
                          } else {
                            this.error =
                              Constants.ERROR_MESSAGES.JOB_COMPLETION.ESTIMATE_PENDING;
                          }
                        } else {
                          this.error =
                            Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
                        }
                      }
                    })
                  );
                } else {
                  if (jobCompletionData[0].shops[0].shopNo === this.shopNo) {
                    this.navigateToJobCompletionPage(jobCompletionData[0]);
                  } else {
                    this.error =
                      Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
                  }
                }
              } else if (!jobCompletionData) {
                this.error = Constants.ERROR_MESSAGES.JOB_COMPLETION.DEFAULT;
              }
            }
          },
          errorResp => {
            this.error = Constants.ERROR_MESSAGES.JOB_COMPLETION.DEFAULT;
          }
        )
      );
    } else {
      this.error = Constants.ERROR_MESSAGES.COMMON.REQUIRED_FIELD('Job Number');
    }
  }

  navigateToJobCompletionPage(jobCompletionData: JobV2): void {
    if (jobCompletionData) {      
      this.jobCompletionState
        .updateJobDetails(jobCompletionData)
        .subscribe(details => {
          this.jobCompletionState.storeDetails$ = details;
          this.error = this.checkStatus(jobCompletionData);
          if (!this.error) {
            this.jobCompletionState.getJobCodes().subscribe(resp => {
              resp.sort((a, b) => {
                return a.code - b.code;
              });
              this.jobCompletionState.jobCodes$ = resp;
              this.jobCompletionState.jobPhotos$ = [];
              if (jobCompletionData.chainTagNo) {
                if (
                  ((jobCompletionData.status ===
                    Constants.STATUS.SC_COMPLETED ||
                    jobCompletionData.status ===
                    Constants.STATUS.SC_SHIPPED) &&
                    jobCompletionData.stores &&
                    jobCompletionData.stores[0] &&
                    jobCompletionData.stores[0].division ===
                    Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) ||
                  (jobCompletionData.status ===
                    Constants.STATUS.MODEL_REJECTED &&
                    jobCompletionData.eRepairJobInformation) ||
                  (jobCompletionData.status ===
                    Constants.STATUS.STORE_RECEIVED &&
                    jobCompletionData.stores &&
                    jobCompletionData.stores[0] &&
                    jobCompletionData.stores[0].division ===
                    Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND) ||
                  (jobCompletionData.status ===
                      Constants.STATUS.CUSTOMER_PICKUP &&
                      jobCompletionData.stores &&
                      jobCompletionData.stores[0] &&
                      jobCompletionData.stores[0].division ===
                      Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND)
                ) {
                  this.jobCompletionState.currentProgressStep = 3;
                  this.router.navigateByUrl(
                    '/job-completion/lookup/employee-entry'
                  );
                } else {
                  this.jobCompletionState.currentProgressStep = 1;
                  this.router.navigateByUrl(
                    '/job-completion/lookup/scan-details'
                  );
                }
              } else {
                this.jobCompletionState.currentProgressStep = 3;
                this.router.navigateByUrl(
                  '/job-completion/lookup/employee-entry'
                );
              }
            });
          }
        });
    }
  }

  get jobNumber() {
    return this.jobNumberForm.get('jobNumber');
  }

  focusOnInit() {
    this.searchInputField.nativeElement.focus();
  }

  checkStatus(job: JobV2): string {
    const activeStore = job.stores.filter(store => store.active)[0];
    if (
      (job.jobCodes != null && job.jobCodes[0] != null) ||
      activeStore.division === Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND
    ) {
      switch (job.status) {
        case Constants.STATUS.SC_COMPLETED:
          if (
            activeStore.division !==
            Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND ||
            job.location !== Constants.LOCATION.SHOP
          ) {
            return Constants.ERROR_MESSAGES.JOB_COMPLETION.ALREADY_COMPLETE;
          } else {
            return null;
          }
        case Constants.STATUS.SC_SHIPPED:
          if (
            activeStore.division !==
            Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND ||
            job.location !== Constants.LOCATION.SHOP
          ) {
            return Constants.ERROR_MESSAGES.JOB_COMPLETION.ALREADY_SHIPPED;
          } else {
            return null;
          }
        case 'SC_ESTIMATE':
          return Constants.ERROR_MESSAGES.JOB_COMPLETION.ESTIMATE_PENDING;
        case 'WAITING_MODEL_APPROVAL':
          return Constants.ERROR_MESSAGES.JOB_COMPLETION.MODEL_APPROVAL_PEDNING;
        case 'MODEL_APPROVED':
          return Constants.ERROR_MESSAGES.JOB_COMPLETION.MODEL_APPROVAL_PEDNING;
        case 'MODEL_REJECTED':
          if (job.jobCodes[0] == null) {
            return Constants.ERROR_MESSAGES.JOB_COMPLETION
              .MODEL_REJECTED_NO_WORK_CODE;
          } else {
            if (job.location !== Constants.LOCATION.SHOP) {
              return Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
            } else {
              return null;
            }
          }
        case 'STORE_RECEIVED':
          if (
            activeStore.division !==
            Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND
          ) {
            return Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
          } else {
            return null;
          }
        case 'REPAIR_CANCEL':
          if (
            activeStore.division !==
            Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND
          ) {
            return Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
          } else {
            return null;
          }
        case 'CUSTOMER_PICKUP':
            if (
              activeStore.division !==
              Constants.BRAND_NAME.BRAND_LOGO.STERLING_BRAND
            ) {
              return Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
            } else {
              return null;
            }
        case Constants.STATUS.SC_TRANSFER:
          return Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
        default:
          if (job.location !== Constants.LOCATION.SHOP) {
            return Constants.ERROR_MESSAGES.JOB_COMPLETION.NOT_IN_SHOP;
          } else {
            return null;
          }
      }
    } else {
      return Constants.ERROR_MESSAGES.JOB_COMPLETION.ESTIMATE_HAS_TO_UPDATE;
    }
  }

  ngOnDestroy() {
    while (this.subscriptions.length > 0) {
      this.subscriptions.pop().unsubscribe();
    }
  }
}
