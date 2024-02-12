import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { JobCompletionContainerComponent } from './job-completion-container.component';
import { JobCompletionLookupComponent } from './components/job-completion-lookup/job-completion-lookup.component';
import { ScanIdComponent } from './components/scan-id/scan-id.component';
import { JobCompletionPhotographyComponent } from './components/job-completion-photography/job-completion-photography.component';
import { JcFinalComponent } from './components/jc-final/jc-final.component';

const routes: Routes = [
  {
    path: '',
    component: JobCompletionContainerComponent,

    children: [
      {
        path: 'lookup',
        component: JobCompletionLookupComponent
      },
      {
        path: 'lookup/scan-details',
        component: ScanIdComponent
      },
      {
        path: 'lookup/photography',
        component: JobCompletionPhotographyComponent
      },
      {
        path: 'lookup/employee-entry',
        component: JcFinalComponent
      },
      { path: '', redirectTo: 'lookup', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class JobCompletionRoutingModule {}
