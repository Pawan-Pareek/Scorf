import { LightningElement,wire,track } from 'lwc';
import getCurrentUserInfo from '@salesforce/apex/ScorfFetchController.ScorfFetchController';

export default class HomeComponent extends LightningElement {
    selectedMenu = 'dashboard';
    
    @track userInfo = {};

    @wire(getCurrentUserInfo)
    wiredUser({ error, data }) {
        if (data) {
            this.userInfo = data;
        } else if (error) {
            console.error(error);
        }
    }

    menuItems = [
        { key: 'dashboard', label: 'Dashboard', icon: 'utility:home' },
        { key: 'projects', label: 'Projects', icon: 'utility:apps' },
        { key: 'letter', label: 'Letter of Intent', icon: 'utility:file' },
        { key: 'reports', label: 'Reports', icon: 'utility:graph' },
        { key: 'closeout', label: 'Close Out Package', icon: 'utility:refresh' }
    ];

    get processedMenuItems() {
        return this.menuItems.map(item => ({
            ...item,
            isSelected: item.key === this.selectedMenu,
            navItemClass: item.key === this.selectedMenu ? 'nav-item selected' : 'nav-item'
        }));
    }

    handleMenuClick(event) {
        this.selectedMenu = event.currentTarget.dataset.key;
    }

    get isDashboardSelected() {
        return this.selectedMenu === 'dashboard';
    }

    get isProjectsSelected() {
        return this.selectedMenu === 'projects';
    }

    get isLetterSelected() {
        return this.selectedMenu === 'letter';
    }

    get isReportsSelected() {
        return this.selectedMenu === 'reports';
    }

    get isCloseoutSelected() {
        return this.selectedMenu === 'closeout';
    }
}