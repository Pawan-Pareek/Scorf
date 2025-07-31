import { LightningElement, api, track, wire } from 'lwc';
// Add this import at the top with other imports
import fetchTechnicalProposalData from '@salesforce/apex/GPSApplicationController.fetchTechnicalProposalData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';


export default class TechnicalProposal extends LightningElement {
    @api recordId;
    @track formData = {};
    @track isInitialized = false;
    @track ignoreParentData = false;

    // Fetch record data when recordId changes
    @wire(fetchTechnicalProposalData, { recordId: '$recordId' })
    wiredTechnicalProposal({ error, data }) {
        if (data) {
            this.setData(data); // use your setData method with Apex data
        }
        if (error) {
            // Handle error gracefully if needed
            // Optionally: Show a toast or error block
        }
    }

    @api
    setData(data) {
        if (!this.ignoreParentData && data) {
            this.formData = {
                Id: data.Id || null, // Preserve the ID field
                PartnerName__c: data.PartnerName__c || '',
                GeographicAreaPopulationPoverty__c: data.GeographicAreaPopulationPoverty__c || '',
                Outline_Existing_Efforts_and_New_Expansi__c: data.Outline_Existing_Efforts_and_New_Expansi__c || '',
                Describe_Current_Budget_and_Funding_Sour__c: data.Describe_Current_Budget_and_Funding_Sour__c || ''
            };
            this.isInitialized = true;
            this.updateFormFields();
        } else if (!this.ignoreParentData && Object.keys(data).length === 0) {
            // If data is an empty object, clear all fields
            this.formData = {
                Id: null,
                PartnerName__c: '',
                GeographicAreaPopulationPoverty__c: '',
                Outline_Existing_Efforts_and_New_Expansi__c: '',
                Describe_Current_Budget_and_Funding_Sour__c: ''
            };
            this.isInitialized = true;
            this.updateFormFields();
        }
    }

    @api
    getData() {
        this.collectFormData();
        return { ...this.formData };
    }

    @api
    validateStep() {
        this.collectFormData();
        const isValid = this.validateFormFields();
        if (!isValid) {
            this.showValidationErrors();
        }
        return isValid;
    }

    handleInputChange(event) {
        this.ignoreParentData = true;
        const fieldName = event.target.name;
        const value = event.target.value;
        this.formData[fieldName] = value;
        this.notifyParent();
    }

    collectFormData() {
        const inputs = this.template.querySelectorAll(
            'lightning-input, lightning-textarea'
        );
        inputs.forEach(input => {
            const fieldName = input.name;
            if (fieldName) {
                this.formData[fieldName] = input.value;
            }
        });
    }

    updateFormFields() {
        setTimeout(() => {
            const inputs = this.template.querySelectorAll(
                'lightning-input, lightning-textarea'
            );
            inputs.forEach(input => {
                const fieldName = input.name;
                if (fieldName && this.formData[fieldName] !== undefined) {
                    input.value = this.formData[fieldName];
                }
            });
        }, 100);
    }

    validateFormFields() {
        let isValid = true;
        const inputs = this.template.querySelectorAll(
            'lightning-input, lightning-textarea'
        );
        inputs.forEach(input => {
            if (input.required && (!input.value || input.value.trim() === '')) {
                isValid = false;
            }
            if (!input.checkValidity()) {
                isValid = false;
            }
        });
        return isValid;
    }

    showValidationErrors() {
        const inputs = this.template.querySelectorAll(
            'lightning-input, lightning-textarea'
        );
        inputs.forEach(input => {
            input.reportValidity();
        });
    }

    // Modify the notifyParent method
notifyParent() {
    try {
        const dataChangeEvent = new CustomEvent('datachange', {
            detail: {
                stepData: this.formData,
                stepType: 'technicalProposal'  // Add this line
            }
        });
        this.dispatchEvent(dataChangeEvent);
    } catch (error) {
        console.error('Error notifying parent:', error);
    }
}

    @api
    handleAddPartnerFromParent() {
        this.handleAddPartner();
    }

    connectedCallback() {
        if (!this.formData || Object.keys(this.formData).length === 0) {
            this.formData = {};
        }
        // Listen for addpartner event from parent as fallback
        this.template?.addEventListener?.('addpartner', this.handleAddPartner.bind(this));
    }

    handleAddPartner() {
        this.clearData();
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Info',
                message: 'Add Partner button clicked (Technical Proposal)',
                variant: 'info'
            })
        );
        this.dispatchEvent(new CustomEvent('partneradded'));
    }

    renderedCallback() {
        if (this.isInitialized) {
            this.updateFormFields();
        }
    }

    // Add this method after the existing API methods (around line 60):
@api
clearData() {
    this.ignoreParentData = true;
    this.formData = {
        PartnerName__c: '',
        GeographicAreaPopulationPoverty__c: '',
        Outline_Existing_Efforts_and_New_Expansi__c: '',
        Describe_Current_Budget_and_Funding_Sour__c: ''
    };
    this.updateFormFields();
    // Do NOT set ignoreParentData = false here
}
}