import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import getProjectData from '@salesforce/apex/ProjectComponentController.getProjectData';
import getApplicationDetails from '@salesforce/apex/ProjectComponentController.getApplicationDetails';
import getPartnerData from '@salesforce/apex/ProjectComponentController.getPartnerData';
import getAbatementStrategies from '@salesforce/apex/ProjectComponentController.getAbatementStrategies';
import getUploadedDocuments from '@salesforce/apex/ProjectComponentController.getUploadedDocuments';
import getDocumentDownloadUrl from '@salesforce/apex/ProjectComponentController.getDocumentDownloadUrl';

export default class ProjectComponent extends NavigationMixin(LightningElement) {

    @track isDocumentsExpanded = false;
@track uploadedDocuments = [];

    @track abatementStrategies = [];
    @track expandedStrategies = new Set();
    @track expandedTechnicalProposals = new Set();

    @track partnerData = [];
    @track isBudgetExpanded = false;
    @track isPartnerModalOpen = false;
    @track selectedPartnerStrategies = [];
    @track selectedPartnerName = '';

    @track isModalOpen = false;
    @track selectedApplication = {};

    @track projectData = {
        approvedCount: 0,
        rejectedCount: 0,
        revisionCount: 0,
        totalCount: 0,
        applications: []
    };

    @wire(getProjectData)
    wiredProjectData({ error, data }) {
        if (data) {
            this.projectData = {
                ...data,
                applications: data.applications.map((app, index) => ({
                    ...app,
                    serialNumber: index + 1,
                    showEdit: app.ApplicationStatus__c === 'Draft' || app.ApplicationStatus__c === 'Revisions requested',
                    formattedDate: this.formatDate(app.CreatedDate)
                }))
            };
        } else if (error) {
            this.showToast('Error', 'Error loading project data: ' + error.body.message, 'error');
        }
    }

    get hasRejectedDot() {
        return this.projectData.rejectedCount > 0;
    }

    formatDate(dateTimeString) {
        if (!dateTimeString) return '';
        
        const date = new Date(dateTimeString);
        
        if (isNaN(date.getTime())) return '';
        
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        return date.toLocaleDateString('en-US', options);
    }

    handleEdit(event) {
        const recordId = event.target.dataset.id;
        // Navigate to the GPSApplication__c page with the recordId in URL
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: {
                url: `/s/gps-application?recordId=${recordId}`
            }
        });
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    async handleView(event) {
        const recordId = event.target.dataset.id;

        const documentsInfo = await this.loadUploadedDocuments(recordId);
        try {
            const appDetails = await getApplicationDetails({ applicationId: recordId });
            const partnerInfo = await this.loadPartnerData(recordId);
            const abatementInfo = await this.loadAbatementStrategies(recordId);

            this.selectedApplication = appDetails;
            this.partnerData = partnerInfo;
            this.abatementStrategies = abatementInfo;
            this.isModalOpen = true;

        } catch (error) {
            this.showToast('Error', 'Error loading application details: ' + (error.body ? error.body.message : error.message), 'error');
        }

        this.uploadedDocuments = documentsInfo;
    }

    closeModal() {
        this.isModalOpen = false;
        this.selectedApplication = {};
        this.partnerData = [];
        this.abatementStrategies = [];
        this.uploadedDocuments = [];
    }

    handleModalBackdropClick(event) {
        if (event.target === event.currentTarget) {
            this.closeModal();
        }
    }

    async loadPartnerData(applicationId) {
        try {
            const data = await getPartnerData({ applicationId: applicationId });
            return data.map((partner, index) => ({
                ...partner,
                serialNumber: index + 1
            }));
        } catch (error) {
            this.showToast('Error', 'Error loading partner data: ' + error.body.message, 'error');
            return [];
        }
    }

    async loadAbatementStrategies(applicationId) {
        try {
            const data = await getAbatementStrategies({ applicationId: applicationId });
            return data;
        } catch (error) {
            this.showToast('Error', 'Error loading abatement strategies: ' + error.body.message, 'error');
            return [];
        }
    }

    handlePartnerView(event) {
        const partnerId = event.target.dataset.id;
        const partner = this.partnerData.find(p => p.id === partnerId);
        
        if (partner) {
            this.selectedPartnerName = partner.partnerName;
            // Filter strategies for this specific partner
            this.selectedPartnerStrategies = this.abatementStrategies.filter(
                strategy => strategy.strategy.Id === partnerId
            );
            this.isPartnerModalOpen = true;
        }
    }

    closePartnerModal() {
        this.isPartnerModalOpen = false;
        this.selectedPartnerStrategies = [];
        this.selectedPartnerName = '';
    }

    handlePartnerModalBackdropClick(event) {
        if (event.target === event.currentTarget) {
            this.closePartnerModal();
        }
    }

    toggleBudgetInfo() {
        this.isBudgetExpanded = !this.isBudgetExpanded;
    }

    get budgetIconName() {
        return this.isBudgetExpanded ? 'utility:chevrondown' : 'utility:chevronright';
    }

    // Keep this logic for the Technical Proposal dropdown
    toggleTechnicalProposal(event) {
        const strategyId = event.currentTarget.dataset.id;
        if (this.expandedTechnicalProposals.has(strategyId)) {
            this.expandedTechnicalProposals.delete(strategyId);
        } else {
            this.expandedTechnicalProposals.add(strategyId);
        }
        this.expandedTechnicalProposals = new Set(this.expandedTechnicalProposals);
    }

    get isTechnicalProposalExpanded() {
    return this.expandedTechnicalProposals.size > 0;
}

    toggleStrategySection(event) {
        const strategyId = event.currentTarget.dataset.id;
        if (this.expandedStrategies.has(strategyId)) {
            this.expandedStrategies.delete(strategyId);
        } else {
            this.expandedStrategies.add(strategyId);
        }
        this.expandedStrategies = new Set(this.expandedStrategies);
    }

    get isStrategyExpanded() {
    return this.expandedStrategies.size > 0;
}

    get getStrategyIcon() {
    return this.isStrategyExpanded ? 'utility:chevrondown' : 'utility:chevronright';
}

    get getTechnicalProposalIcon() {
    return this.isTechnicalProposalExpanded ? 'utility:chevrondown' : 'utility:chevronright';
}

toggleUploadedDocuments() {
    this.isDocumentsExpanded = !this.isDocumentsExpanded;
}

get documentsIconName() {
    return this.isDocumentsExpanded ? 'utility:chevrondown' : 'utility:chevronright';
}

async handleDocumentDownload(event) {
    const documentId = event.target.dataset.id;
    try {
        const downloadUrl = await getDocumentDownloadUrl({ documentId: documentId });
        window.open(downloadUrl, '_blank');
    } catch (error) {
        this.showToast('Error', 'Error downloading document: ' + (error.body ? error.body.message : error.message), 'error');
    }
}

async loadUploadedDocuments(applicationId) {
    try {
        const data = await getUploadedDocuments({ applicationId: applicationId });
        return data.map(doc => ({
            ...doc,
            displayName: doc.fileExtension ? `${doc.name}.${doc.fileExtension}` : doc.name
        }));
    } catch (error) {
        this.showToast('Error', 'Error loading documents: ' + (error.body ? error.body.message : error.message), 'error');
        return [];
    }
}
}