// Fixed GPS Application Component - Main Issues Addressed:
// 1. Portal compatibility fixes
// 2. Component lifecycle improvements
// 3. Better error handling
// 4. Data loading fixes

import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Apex methods from the controller
import getPicklistValues from '@salesforce/apex/GPSApplicationController.getPicklistValues';
import saveApplication from '@salesforce/apex/GPSApplicationController.saveApplication';
import getApplication from '@salesforce/apex/GPSApplicationController.getApplication';
import saveTechnicalProposal from '@salesforce/apex/GPSApplicationController.saveTechnicalProposal';

// Static resource for logo
import gpsLogo from '@salesforce/resourceUrl/ScorfBanner';

export default class GpsApplication extends LightningElement {
    // Set logo from static resource
    logoUrl = gpsLogo;
    
    // Public property to hold the record ID passed from parent
    // record id of funding application record that is passed to abatement strategy record
    @api recordId;

    // Reactive tracked properties
    @track applicationData = {};
    @track picklistValues = {};
    @track isLoading = true; // Start with loading true
    @track currentStep = 1;

    // Step indicator configuration
    @track steps = [
        { number: 1, label: 'Organization Information', cssClass: 'step active' },
        { number: 2, label: 'Technical Proposal', cssClass: 'step' },
        { number: 3, label: 'Abatement Strategies', cssClass: 'step' },
        { number: 4, label: 'Budget Information', cssClass: 'step' }
    ];

    // Flags to track data loading state
    @track isDataLoaded = false;
    @track picklistLoaded = false;
    @track applicationLoaded = false;

    // Error handling
    @track hasError = false;
    @track errorMessage = '';

    //Store each and every step data
    @track organizationData = {};
    @track technicalProposalData = {};
    // Add this after line where you have technicalProposalData

    // Lifecycle hook - loads data when component is inserted into DOM
    connectedCallback() {
        console.log('GPS Application Connected - Record ID:', this.recordId);
        this.initializeComponent();
    }

    // Initialize component with proper error handling
    initializeComponent() {
        try {
            this.isLoading = true;
            this.hasError = false;
            
            // Load application data if recordId exists
            if (this.recordId) {
                this.loadApplicationData();
            } else {
                // If no recordId, mark application as loaded
                this.applicationLoaded = true;
                this.applicationData = {};
                this.checkIfAllDataLoaded();
            }
        } catch (error) {
            console.error('Error initializing component:', error);
            this.handleError('Failed to initialize application form', error);
        }
    }

    // Load application data
    loadApplicationData() {
        getApplication({ recordId: this.recordId })
            .then(result => {
                console.log('Application data loaded:', result);
                this.applicationData = result ? { ...result } : {};
                this.applicationLoaded = true;
                this.checkIfAllDataLoaded();
            })
            .catch(error => {
                console.error('Error loading application data:', error);
                this.applicationLoaded = true; // Mark as loaded even on error
                this.applicationData = {};
                this.checkIfAllDataLoaded();
                
                // Show error but don't block the form
                this.showToast('Warning', 'Could not load existing application data. Starting with blank form.', 'warning');
            });
    }

    // Wire Apex method to load all picklist values
    @wire(getPicklistValues)
    wiredPicklistValues({ error, data }) {
        if (data) {
            console.log('Picklist values loaded:', data);
            this.picklistValues = data;
            this.picklistLoaded = true;
            this.checkIfAllDataLoaded();
        } else if (error) {
            console.error('Error loading picklist values:', error);
            this.picklistLoaded = true; // Mark as loaded even on error
            this.picklistValues = {};
            this.checkIfAllDataLoaded();
            this.showToast('Warning', 'Could not load form options. Some fields may not work properly.', 'warning');
        }
    }

    // Check if all required data is loaded
    checkIfAllDataLoaded() {
        console.log('Checking data loaded state:', {
            picklistLoaded: this.picklistLoaded,
            applicationLoaded: this.applicationLoaded
        });
        
        if (this.picklistLoaded && this.applicationLoaded) {
            this.isDataLoaded = true;
            this.isLoading = false;
            console.log('All data loaded successfully');
            
            // Ensure child components get the data
            this.notifyChildComponents();
        }
    }

    // Notify child components that data is ready
    notifyChildComponents() {
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            this.passDataToCurrentStep();
        }, 100);
    }

    // Replace the existing handleDataChange method
handleDataChange(event) {
    try {
        const { stepData, stepType } = event.detail;
        console.log('Data change received:', stepData, 'Step type:', stepType);
        
        // Store data based on step type
        if (stepType === 'organization') {
            this.organizationData = { ...stepData };
        } else if (stepType === 'technicalProposal') {
            this.technicalProposalData = { ...stepData };
        }
        
        // Keep existing applicationData for backward compatibility
        this.applicationData = {
            ...this.applicationData,
            ...stepData
        };

        console.log('Organization data:', this.organizationData);
        console.log('Technical proposal data:', this.technicalProposalData);
        
    } catch (error) {
        console.error('Error handling data change:', error);
        this.showToast('Error', 'Failed to update form data', 'error');
    }
}

    // Auto-save functionality to persist data
    autoSaveData() {
        if (this.recordId) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                this.saveApplicationData(false);
            }, 2000); // Increased timeout for better performance
        }
    }

    // Navigate to next step
    handleNext() {
        try {
            if (this.validateCurrentStep()) {
                if (this.currentStep < 4) {
                    this.saveCurrentStepData();
                    this.currentStep++;
                    this.updateStepStyles();
                    this.notifyChildComponents();
                }
            }
        } catch (error) {
            console.error('Error navigating to next step:', error);
            this.showToast('Error', 'Failed to navigate to next step', 'error');
        }
    }

    // Navigate to previous step
    handlePrevious() {
        try {
            if (this.currentStep > 1) {
                this.saveCurrentStepData();
                this.currentStep--;
                this.updateStepStyles();
                this.notifyChildComponents();
            }
        } catch (error) {
            console.error('Error navigating to previous step:', error);
            this.showToast('Error', 'Failed to navigate to previous step', 'error');
        }
    }

    // Save current step data
    saveCurrentStepData() {
        try {
            const currentStepComponent = this.template.querySelector(`[data-step="${this.currentStep}"]`);
            if (currentStepComponent && typeof currentStepComponent.getData === 'function') {
                const stepData = currentStepComponent.getData();
                this.applicationData = {
                    ...this.applicationData,
                    ...stepData
                };
                console.log('Current step data saved:', stepData);
            }
        } catch (error) {
            console.error('Error saving current step data:', error);
        }
    }

    // Pass data to current step component
    passDataToCurrentStep() {
        try {
            const currentStepComponent = this.template.querySelector(`[data-step="${this.currentStep}"]`);
            if (currentStepComponent && typeof currentStepComponent.setData === 'function') {
                currentStepComponent.setData(this.applicationData);
                console.log('Data passed to step component:', this.currentStep);
            }
        } catch (error) {
            console.error('Error passing data to current step:', error);
        }
    }

    // Validate current step
    validateCurrentStep() {
        try {
            const currentStepComponent = this.template.querySelector(`[data-step="${this.currentStep}"]`);
            if (currentStepComponent && typeof currentStepComponent.validateStep === 'function') {
                return currentStepComponent.validateStep();
            }
            return true;
        } catch (error) {
            console.error('Error validating current step:', error);
            return false;
        }
    }

    // Update step styles
    updateStepStyles() {
        this.steps = this.steps.map(step => ({
            ...step,
            cssClass: step.number === this.currentStep ? 'step active' :
                step.number < this.currentStep ? 'step completed' : 'step'
        }));
    }

    // Save application
handleSave() {
    try {
        if (!this.validateAllSteps()) {
            return;
        }

        this.saveCurrentStepData();
        this.saveAllApplicationData();
    } catch (error) {
        console.error('Error saving application:', error);
        this.showToast('Error', 'Failed to save application', 'error');
    }
}

// Add this new method
saveAllApplicationData() {
    this.isLoading = true;
    
    // Save organization information first
    this.saveOrganizationData()
        .then(() => {
            // Then save technical proposal
            return this.saveTechnicalProposalData();
        })
        .then(() => {
            this.showToast('Success', 'Application saved successfully', 'success');
            this.isLoading = false;
        })
        .catch(error => {
            console.error('Error saving application data:', error);
            this.showToast('Error', 'Failed to save application', 'error');
            this.isLoading = false;
        });
}

// Add these new methods
saveOrganizationData() {
    if (Object.keys(this.organizationData).length === 0) {
        return Promise.resolve();
    }
    
    console.log('Saving organization data:', this.organizationData);
    return saveApplication({ application: this.organizationData })
        .then(result => {
            console.log('Organization data saved:', result);
            this.recordId = result.Id; // Update recordId for subsequent saves
        });
}


saveTechnicalProposalData() {
    if (Object.keys(this.technicalProposalData).length === 0) {
        return Promise.resolve();
    }
    
    // Add the recordId to technical proposal data if available
    const technicalData = {
        ...this.technicalProposalData,
        Funding_Application__c: this.recordId // Assuming lookup field name
    };
    
    console.log('Saving technical proposal data:', JSON.stringify(technicalData));
    return saveTechnicalProposal({ abatement: technicalData })
        .then(result => {
            console.log('Technical proposal saved:', result);
        });
}



    // Validate all steps
    validateAllSteps() {
        try {
            this.saveCurrentStepData();
            return this.validateCurrentStep();
        } catch (error) {
            console.error('Error validating all steps:', error);
            return false;
        }
    }

    // Save application data
    saveApplicationData(showToast = true) {
        this.isLoading = true;
        
        console.log('Saving application data2:', JSON.stringify(this.applicationData));
        
        saveApplication({ application: this.applicationData })
            .then(result => {
                console.log('Application saved successfully2:', JSON.stringify(result));
                // this.applicationData = { ...result };
                console.log('Updated application data2:', JSON.stringify(this.applicationData));
                this.recordId = result.Id;
                
                if (showToast) {
                    this.showToast('Success', 'Application saved successfully', 'success');
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error saving application:', error);
                if (showToast) {
                    const errorMessage = error.body ? error.body.message : 'Unknown error occurred';
                    this.showToast('Error', `Failed to save application: ${errorMessage}`, 'error');
                }
                this.isLoading = false;
            });
    }

    // Handle errors
    handleError(message, error) {
        console.error(message, error);
        this.hasError = true;
        this.errorMessage = message;
        this.isLoading = false;
        this.showToast('Error', message, 'error');
    }

    // Show toast notifications
    showToast(title, message, variant) {
        try {
            const event = new ShowToastEvent({
                title: title,
                message: message,
                variant: variant
            });
            this.dispatchEvent(event);
        } catch (error) {
            console.error('Error showing toast:', error);
            // Fallback for portals where ShowToastEvent might not work
            console.log(`${title}: ${message}`);
        }
    }

    // Getters for template rendering
    get isStep1() { return this.currentStep === 1; }
    get isStep2() { return this.currentStep === 2; }
    get isStep3() { return this.currentStep === 3; }
    get isStep4() { return this.currentStep === 4; }
    get isFirstStep() { return this.currentStep === 1; }
    get isLastStep() { return this.currentStep === 4; }

    // Get data for each step
    get step1Data() {
        return { ...this.applicationData };
    }

    get step2Data() {
        return { ...this.applicationData };
    }

    get step3Data() {
        return { ...this.applicationData };
    }

    get step4Data() {
        return { ...this.applicationData };
    }

    // Show loading state properly
    get showSpinner() {
        return this.isLoading && !this.hasError;
    }

    // Show content when data is loaded and no errors
    get showContent() {
        return this.isDataLoaded && !this.hasError;
    }

    // Rendered callback
    renderedCallback() {
        if (this.isDataLoaded && !this.hasError) {
            this.passDataToCurrentStep();
        }
    }

    // Error recovery method
    retryLoad() {
        this.hasError = false;
        this.errorMessage = '';
        this.initializeComponent();
    }
}