import {
  Component,
  ViewChild,
  ElementRef,
  OnDestroy,
  AfterViewInit,
  OnInit
} from '@angular/core';
import { Subscription } from 'rxjs';
import { JobState } from 'src/app/shared/state/job.state';
import { JobCompletionState } from 'src/app/shared/state/job-completion.state';
import { Constants } from 'src/app/shared/constants';
import { Router } from '@angular/router';
import { AddImage } from 'src/app/shared/business-objects/addImage';
import { JobV2 } from 'src/app/shared/business-objects/job-v2';
import { LoginState } from 'src/app/shared/state/login.state';
import { DomSanitizer } from '@angular/platform-browser';
import { EventService } from 'src/app/shared/services/event.service';

@Component({
  selector: 'app-job-completion-photography',
  templateUrl: './job-completion-photography.component.html',
  styleUrls: ['./job-completion-photography.component.scss']
})
export class JobCompletionPhotographyComponent
  implements OnDestroy, OnInit {
  @ViewChild('video', { static: true }) video: ElementRef;
  @ViewChild('canvas', { static: true }) canvas: ElementRef;
  @ViewChild('comment') commentField: ElementRef;
  subscribers: Subscription[] = [];
  jobPhoto: string;
  comment: string;
  takePhotos = true;
  displayMessages = Constants.DISPLAY_MESSAGES;
  jobDetails: JobV2;
  proceedToNextFlag: boolean = false;
  jobPhotos: string[] = [];
  jobImages: AddImage[] = [];
  shopNo: number;

  constructor(
    private jobState: JobState,
    private router: Router,
    private jobCompletionState: JobCompletionState,
    private loginState: LoginState,
    public domSanitizer: DomSanitizer,
    private _eventService : EventService
  ) { }

  ngOnInit() {
    let startTime = new Date();
    this.jobImages = [];
    this.jobDetails = this.jobCompletionState.jobDetails$;
    this.jobCompletionState.jobPhotos$ = [];
    this.launchCamera();
    let endTime = new Date();
    this._eventService.createPageLoadEvent('PAGE_LOAD_TIME', 'Job Completion Photography', startTime, endTime, null).subscribe();
  }

  getBreadCrumbTitles(): string[] {
    return ['Job Completion', 'Scan Identification Tags', 'Take Photos'];
  }

  getBreadCrumbLinks(): string[] {
    return ['/job-completion/lookup', '/job-completion/lookup/scan-details'];
  }

  updateComment(event: KeyboardEvent): void {
    this.comment = (event.target as HTMLInputElement).value;
  }

  launchCamera(): void {
    const newSubs: Subscription[] = [
      this.loginState.$dsc.subscribe(shopNo => this.shopNo = shopNo),
      this.jobState.openCamera().subscribe(res => {
        if (res.result.imageData === '') {
          this.launchCamera();
        } else {
          this.jobPhoto = `data:image/jpeg;base64,${
            res.result.imageData
            }`;
          this.jobPhotos.push(this.jobPhoto);
          this.addImageToJob(false);
          this.takePhotos = false;
        }
      }, (err) => {
        if (err.status == 500) {
          this.router.navigateByUrl('/job-completion/lookup/scan-details');
        }
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            this.video.nativeElement.srcObject = stream;
            this.video.nativeElement.play();
          });
        }
      })
    ];
    this.subscribers.push(...newSubs);

  }

  capture(): void {
    const context = this.canvas.nativeElement
      .getContext('2d')
      .drawImage(this.video.nativeElement, 0, 0, 640, 480);
    this.jobPhoto = this.canvas.nativeElement.toDataURL('image/png');
    this.jobPhotos.push(this.jobPhoto);
    this.addImageToJob(false);
    this.takePhotos = false;
  }

  clearImage(index: number): void {
    this.jobPhotos.splice(index, 1);
    this.jobImages.splice(index, 1);
    this.takePhotos = true;
    this.launchCamera();
  }

  addImageToJob(proceedToJobCodes: boolean): void {
    const image: AddImage = {
      comment: this.comment,
      imageData: this.jobPhoto,
      inQueue: false,
      mimeType: 'image/png',
      master: true,
      inQueueId: null,
      imageTakenType: 'C',
      imageStatus: 'PENDING'
    };
    if (this.jobDetails.chainTagNos.length <= this.jobPhotos.length) {
      this.proceedToNextFlag = true;
    }
    this.jobImages.push(image);
  }

  takeAnother(): void {
    this.takePhotos = true;
    this.launchCamera();
  }

  proceedToJobCodes(): void {
    this.jobCompletionState.currentProgressStep = 3;
    this.jobCompletionState.jobPhotos$ = this.jobImages;
    this.router.navigateByUrl('/job-completion/lookup/employee-entry');
  }

  navigateToScan(): void {
    this.jobCompletionState.currentProgressStep = 1;
    this.router.navigateByUrl('/job-completion/lookup');
  }

  ngOnDestroy() {
    while (this.subscribers.length > 0) {
      this.subscribers.pop().unsubscribe();
    }
  }
}
