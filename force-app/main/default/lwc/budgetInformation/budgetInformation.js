import { LightningElement, api, track } from 'lwc';

export default class BudgetInformation extends LightningElement {
    @api applicationData = {};
    @api picklistValues = {};
    @api recordId;

    // Budget form fields
    @track totalProjectBudget = '';
    @track minusEstimatedCarryForward = '';
    @track minusEstimatedInterestEarned = '';
    @track totalAmountRequested = '';
    @track electronicSignature = '';
    @track todaysDate = '';

    // Initialize component
    connectedCallback() {
        this.setTodaysDate();
        this.loadExistingData();
    }

    // Set today's date in the required format
    setTodaysDate() {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        this.todaysDate = `${month}/${day}/${year}`;
    }

    // Load existing data when applicationData changes
    @api
    setData(data) {
        if (data) {
            this.applicationData = { ...data };
            this.loadExistingData();
        }
    }

    // Load existing data from applicationData
    loadExistingData() {
        if (this.applicationData) {
            this.totalProjectBudget = this.applicationData.Total_Project_Budget__c || '';
            this.minusEstimatedCarryForward = this.applicationData.MinusEstimatedCarryForwardAmount__c || '';
            this.minusEstimatedInterestEarned = this.applicationData.MinusEstimatedInterestEarned__c || '';
            this.totalAmountRequested = this.applicationData.Total_Amount_Requested__c || '';
            this.electronicSignature = this.applicationData.ElectronicSignature__c || '';
        }
    }

    // Handle input field changes
    handleFieldChange(event) {
        const fieldName = event.target.name;
        const value = event.target.value;
        
        switch(fieldName) {
            case 'totalProjectBudget':
                this.totalProjectBudget = value;
                break;
            case 'minusEstimatedCarryForward':
                this.minusEstimatedCarryForward = value;
                break;
            case 'minusEstimatedInterestEarned':
                this.minusEstimatedInterestEarned = value;
                break;
            case 'totalAmountRequested':
                this.totalAmountRequested = value;
                break;
            case 'electronicSignature':
                this.electronicSignature = value;
                break;
        }

        // Auto-calculate Total Amount Requested
        this.calculateTotalAmountRequested();
        
        // Notify parent of data change
        this.notifyParent();
    }

    // Auto-calculate Total Amount Requested
    calculateTotalAmountRequested() {
        const budget = parseFloat(this.totalProjectBudget) || 0;
        const carryForward = parseFloat(this.minusEstimatedCarryForward) || 0;
        const interestEarned = parseFloat(this.minusEstimatedInterestEarned) || 0;
        
        const calculatedTotal = budget - carryForward - interestEarned;
        this.totalAmountRequested = calculatedTotal.toFixed(2);
    }

    // Notify parent component of data changes
    notifyParent() {
        const budgetData = this.getData();
        this.dispatchEvent(new CustomEvent('datachange', {
            detail: {
                stepData: budgetData,
                stepType: 'budgetInformation' // Make sure this matches the condition in parent
            },
            bubbles: true,
            composed: true
        }));
    }

    // Get current form data
    @api
    getData() {
        return {
            Total_Project_Budget__c: this.totalProjectBudget,
            MinusEstimatedCarryForwardAmount__c: this.minusEstimatedCarryForward,
            MinusEstimatedInterestEarned__c: this.minusEstimatedInterestEarned,
            Total_Amount_Requested__c: this.totalAmountRequested,
            ElectronicSignature__c: this.electronicSignature
        };
    }

    // Validate the form
    @api
    validateStep() {
        const inputs = this.template.querySelectorAll('lightning-input');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.checkValidity()) {
                input.reportValidity();
                isValid = false;
            }
        });

        // Additional validation for required fields
        if (!this.totalProjectBudget) {
            this.showFieldError('Total Project Budget is required');
            isValid = false;
        }

        if (!this.totalAmountRequested) {
            this.showFieldError('Total Amount Requested is required');
            isValid = false;
        }

        if (!this.electronicSignature) {
            this.showFieldError('Electronic Signature is required');
            isValid = false;
        }

        return isValid;
    }

    // Show field validation error
    showFieldError(message) {
        // You can implement custom error display here if needed
        console.error(message);
    }

    // Format currency display
    get formattedTotalProjectBudget() {
        return this.totalProjectBudget ? `$${parseFloat(this.totalProjectBudget).toFixed(2)}` : '$0.00';
    }

    get formattedCarryForward() {
        return this.minusEstimatedCarryForward ? `$${parseFloat(this.minusEstimatedCarryForward).toFixed(2)}` : '$0.00';
    }

    get formattedInterestEarned() {
        return this.minusEstimatedInterestEarned ? `$${parseFloat(this.minusEstimatedInterestEarned).toFixed(2)}` : '$0.00';
    }

    get formattedTotalRequested() {
        return this.totalAmountRequested ? `$${parseFloat(this.totalAmountRequested).toFixed(2)}` : '$0.00';
    }
}