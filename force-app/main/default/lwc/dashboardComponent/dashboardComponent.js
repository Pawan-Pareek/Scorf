import { LightningElement, api, wire, track } from 'lwc';
import userId from '@salesforce/user/Id';

export default class DashboardComponent extends LightningElement {
 dashboardId='01ZdL000005BstRUAS';
  get dashboardUrl() {
    return `/desktopDashboards/dashboardApp.app?dashboardId=${this.dashboardId}&displayMode=view&networkId=000000000000000&userId=${userId}`
  }
}