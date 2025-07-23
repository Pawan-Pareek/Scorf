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
//import saveTechnicalProposal from '@salesforce/apex/GPSApplicationController.saveTechnicalProposal';
import saveAbatementStrategies from '@salesforce/apex/GPSApplicationController.saveAbatementStrategies';
import saveStrategyLineItems from '@salesforce/apex/GPSApplicationController.saveStrategyLineItems';
import saveStrategyResources from '@salesforce/apex/GPSApplicationController.saveStrategyResources';

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
    @track abatementStrategiesData = {};
    // Add this after line where you have technicalProposalData

    // Store all strategy line resources data
    @track strategyLineResourcesData = {};

    // Add this property to store both personnel and budget data
    @track abatementExtraData = {};

    // Handler for bubbling event from strategyLineResources
    handleStrategyLineResourcesChange(event) {
        const { strategyValue, data } = event.detail;
        this.strategyLineResourcesData = {
            ...this.strategyLineResourcesData,
            [strategyValue]: data
        };
        // Optionally, persist to backend here or on save
        console.log('handleStrategyLineResourcesChange START'+JSON.stringify(this.strategyLineResourcesData));
    }

    // Lifecycle hook - loads data when component is inserted into DOM
    connectedCallback() {
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
            this.handleError('Failed to initialize application form', error);
        }
    }

    // Load application data
    loadApplicationData() {
        getApplication({ recordId: this.recordId })
            .then(result => {
                this.applicationData = result ? { ...result } : {};
                this.applicationLoaded = true;
                this.checkIfAllDataLoaded();
            })
            .catch(error => {
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
            this.picklistValues = data;
            this.picklistLoaded = true;
            this.checkIfAllDataLoaded();
        } else if (error) {
            this.picklistLoaded = true; // Mark as loaded even on error
            this.picklistValues = {};
            this.checkIfAllDataLoaded();
            this.showToast('Warning', 'Could not load form options. Some fields may not work properly.', 'warning');
        }
    }

    // Check if all required data is loaded
    checkIfAllDataLoaded() {
        
        if (this.picklistLoaded && this.applicationLoaded) {
            this.isDataLoaded = true;
            this.isLoading = false;
            
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
    const { stepData, stepType } = event.detail;
    if (stepType === 'organization') {
        console.log('Data received from organizationInformation child:', JSON.stringify(stepData));
        this.organizationData = { ...stepData };
    }
    // Log all abatement-related data received from child
    try {
        const { abatementStrategies, personnelData, budgetData, stepType } = event.detail;
        console.log('Abatement Data Received - abatementStrategies:', JSON.stringify(abatementStrategies));
        console.log('Abatement Data Received - personnelData:', JSON.stringify(personnelData));
        console.log('Abatement Data Received - budgetData:', JSON.stringify(budgetData));
        console.log('Abatement Data Received - stepType:', stepType);
        if (stepType === 'abatementStrategies') {
            // Log the strategyLineResources data specifically
            if (abatementStrategies && abatementStrategies.strategyLineResources) {
                console.log('Abatement Data Received - strategyLineResources:', JSON.stringify(abatementStrategies.strategyLineResources));
            } else {
                console.log('Abatement Data Received - strategyLineResources: EMPTY or UNDEFINED');
            }
            this.abatementStrategiesData = { ...abatementStrategies };
            this.abatementExtraData = {
                personnelData: personnelData || {},
                budgetData: budgetData || {}
            };
            // Assign strategyLineResources to this.strategyLineResourcesData
            if (abatementStrategies && abatementStrategies.strategyLineResources) {
                this.strategyLineResourcesData = { ...abatementStrategies.strategyLineResources };
                console.log('strategyLineResourcesData assigned in parent:', JSON.stringify(this.strategyLineResourcesData));
            }
            // Log after assignment
            console.log('Updated abatementStrategiesData:', JSON.stringify(this.abatementStrategiesData));
            console.log('Updated abatementExtraData:', JSON.stringify(this.abatementExtraData));
        }
        // ...rest of your logic...
    } catch (error) {
        this.showToast('Error', 'Failed to update form data', 'error');
    }
}

    // Auto-save functionality to persist data
    autoSava() {
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
                if (this.currentStep === 3) {
                    // Reset expanded state in abatement-strategies before leaving step 3
                    const abatementCmp = this.template.querySelector('c-abatement-strategies');
                    if (abatementCmp && typeof abatementCmp.resetExpandedStrategies === 'function') {
                        abatementCmp.resetExpandedStrategies();
                    }
                }
                if (this.currentStep < 4) {
                    this.saveCurrentStepData();
                    this.currentStep++;
                    this.updateStepStyles();
                    this.notifyChildComponents();
                }
            }
        } catch (error) {
            this.showToast('Error', 'Failed to navigate to next step', 'error');
        }
    }

    // Navigate to previous step
    handlePrevious() {
        try {
            if (this.currentStep === 4) {
                // Reset expanded state in abatement-strategies before leaving step 3 (when going back from 4 to 3)
                const abatementCmp = this.template.querySelector('c-abatement-strategies');
                if (abatementCmp && typeof abatementCmp.resetExpandedStrategies === 'function') {
                    abatementCmp.resetExpandedStrategies();
                }
            }
            if (this.currentStep > 1) {
                this.saveCurrentStepData();
                this.currentStep--;
                this.updateStepStyles();
                this.notifyChildComponents();
            }
        } catch (error) {
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
                if (this.currentStep === 3 && this.abatementStrategiesData) {
                    const dataToPass = {
                        ...this.applicationData,
                        ...this.abatementStrategiesData,
                        ...this.abatementExtraData
                    };
                    console.log('Passing abatementStrategiesData to child:', this.abatementStrategiesData);
                    console.log('Passing abatementExtraData to child:', this.abatementExtraData);
                    currentStepComponent.setData(dataToPass);
                } else {
                    currentStepComponent.setData(this.applicationData);
                }
            }
        } catch (error) {
            this.showToast('Error', 'Failed to pass data to step', 'error');
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
        this.showToast('Error', 'Failed to save application', 'error');
    }
}

// Add this new method
saveAllApplicationData() {
    // Before saving, get the latest data from the child
    const orgComponent = this.template.querySelector('c-organization-information[data-step="1"]');
    if (orgComponent && typeof orgComponent.getData === 'function') {
        this.organizationData = { ...orgComponent.getData() };
    }
    this.isLoading = true;
    
    // Save organization information first
    this.saveOrganizationData()
        .then(() => {
            // Then save abatement strategies
            return this.saveAbatementStrategiesData();
        })
        .then(() => {
            this.showToast('Success', 'Application saved successfully', 'success');
            this.isLoading = false;
        })
        .catch(error => {
            this.showToast('Error', 'Failed to save application', 'error');
            this.isLoading = false;
        });
}

// Add these new methods
saveOrganizationData() {
    console.log('saveOrganizationData START');
    console.log('Funding Application data to be sent to Apex:', JSON.stringify(this.organizationData));
    if (Object.keys(this.organizationData).length === 0) {
        return Promise.resolve();
    }
    
    return saveApplication({ application: this.organizationData })
        .then(result => {
            this.recordId = result.Id; // Update recordId for subsequent saves
        })
        .catch(error => {
            throw error;
        });
}


saveAbatementStrategiesData() {
    console.log('saveAbatementStrategiesData START');
    if (Object.keys(this.abatementStrategiesData).length === 0) {
        console.log('abatementStrategiesData is empty, skipping saveAbatementStrategies Apex call.');
        return Promise.resolve();
    }

    // Only include allowed fields
    const allowedFields = [
        'Id',
        'Funding_Application__c',
        'PartnerName__c',
        'GeographicAreaPopulationPoverty__c',
        'Outline_Existing_Efforts_and_New_Expansi__c',
        'Describe_Current_Budget_and_Funding_Sour__c',
        'CoreStrategies__c',
        'Core_Abatement_Strategies__c'
    ];
    const filteredAbatementData = {};
    allowedFields.forEach(field => {
        if (this.abatementStrategiesData[field] !== undefined) {
            filteredAbatementData[field] = this.abatementStrategiesData[field];
        }
    });
    // Ensure Funding_Application__c is set for lookup
    if (!filteredAbatementData['Funding_Application__c'] && this.recordId) {
        filteredAbatementData['Funding_Application__c'] = this.recordId;
    }

    // Create proper SObject structure for Abatement_Strategies__c
    const abatementData = filteredAbatementData;

    console.log('Calling Apex saveAbatementStrategies with properly structured data:', JSON.stringify(abatementData));
    return saveAbatementStrategies({ abatement: JSON.stringify(abatementData) })
        .then(result => {
            console.log('Abatement strategies saved successfully. Result:', result);
            if (result && result.success && result.record && result.record.Id) {
                const abatementId = result.record.Id;
                // 1. Save strategy line items (existing logic)
                const allowedLineItemFields = [
                    'BudgetAmountForThePurchase__c',
                    'IsYourStrategyInitialContinuation__c',
                    'BudgetNarrative__c',
                    'ImplementationPlanForTheStrategy__c',
                    'ProvideTheOutcomeMeasures__c',
                    'ProvideTheProcessMeasures__c',
                    'Strategy_Value__c'
                ];
                const filteredStrategyLineResourcesData = {};
                Object.keys(this.strategyLineResourcesData).forEach(key => {
                    const item = this.strategyLineResourcesData[key];
                    const filteredItem = {};
                    allowedLineItemFields.forEach(field => {
                        if (item[field] !== undefined) {
                            filteredItem[field] = item[field];
                        }
                    });
                    // Add abatementId to each item
                    filteredItem['abatementId'] = abatementId;
                    filteredStrategyLineResourcesData[key] = filteredItem;
                });
                // Save strategy line items
                console.log('Calling Apex saveStrategyLineItems with:', JSON.stringify( {
                    abatementId: abatementId,
                    lineItemsJson: JSON.stringify(filteredStrategyLineResourcesData)
                }));
                return saveStrategyLineItems({
                    abatementId: abatementId,
                    lineItemsJson: JSON.stringify(filteredStrategyLineResourcesData)
                }).then(lineItemResult => {
                    if (lineItemResult && lineItemResult.success) {
                        this.showToast('Success', 'Strategy Line Items saved successfully', 'success');
                    } else {
                        this.showToast('Error', 'Failed to save Strategy Line Items: ' + (lineItemResult && lineItemResult.error ? lineItemResult.error : ''), 'error');
                    }
                    // 2. Save strategy resources (new logic)
                    const resourcesToSave = [];
                    // Personnel
                    if (this.abatementExtraData && this.abatementExtraData.personnelData) {
                        Object.keys(this.abatementExtraData.personnelData).forEach(subStrategy => {
                            this.abatementExtraData.personnelData[subStrategy].forEach(personnelRow => {
                                resourcesToSave.push({
                                    RecordTypeName: 'Personnel Information',
                                    Strategy_Name__c: subStrategy,
                                    Abatement_Strategies__c: abatementId,
                                    ...personnelRow
                                });
                            });
                        });
                    }
                    // Budget
                    if (this.abatementExtraData && this.abatementExtraData.budgetData) {
                        Object.keys(this.abatementExtraData.budgetData).forEach(subStrategy => {
                            this.abatementExtraData.budgetData[subStrategy].forEach(budgetRow => {
                                resourcesToSave.push({
                                    RecordTypeName: 'Budget Information',
                                    Strategy_Name__c: subStrategy,
                                    Abatement_Strategies__c: abatementId,
                                    ...budgetRow
                                });
                            });
                        });
                    }
                    if (resourcesToSave.length > 0) {
                        return saveStrategyResources({ resourcesJson: JSON.stringify(resourcesToSave) })
                            .then(resourceResult => {
                                if (resourceResult && resourceResult.success) {
                                    this.showToast('Success', 'Strategy Resources saved successfully', 'success');
                                } else {
                                    this.showToast('Error', 'Failed to save Strategy Resources: ' + (resourceResult && resourceResult.error ? resourceResult.error : ''), 'error');
                                }
                                return result;
                            })
                            .catch(error => {
                                this.showToast('Error', 'Error saving Strategy Resources: ' + (error && error.body && error.body.message ? error.body.message : error), 'error');
                                throw error;
                            });
                    }
                    return result;
                });
            }
            return result;
        })
        .catch(error => {
            this.showToast('Error', 'Failed to save abatement strategies: ' + (error && error.body && error.body.message ? error.body.message : error), 'error');
            throw error;
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
        console.log('saveApplicationData START');
        this.isLoading = true;
        
        saveApplication({ application: this.applicationData })
            .then(result => {
                // this.applicationData = { ...result };
                this.recordId = result.Id;
                
                if (showToast) {
                    this.showToast('Success', 'Application saved successfully', 'success');
                }
                this.isLoading = false;
            })
            .catch(error => {
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
    get step1Data() { return { ...this.applicationData }; }

    get step2Data() { return { ...this.applicationData }; }

    get step3Data() { const data = { ...this.applicationData, ...this.abatementStrategiesData, ...this.abatementExtraData }; return data; }

    // Show loading state properly
    get showSpinner() { return this.isLoading && !this.hasError; }

    // Show content when data is loaded and no errors
    get showContent() { return this.isDataLoaded && !this.hasError; }

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

    handleAddPartner() {
        // Find the abatementStrategies child component
        const abatementCmp = this.template.querySelector('c-abatement-strategies');
        if (abatementCmp) {
            // Call a public @api method or dispatch an event to notify the child
            if (typeof abatementCmp.handleAddPartnerFromParent === 'function') {
                abatementCmp.handleAddPartnerFromParent();
            } else {
                // Fallback: dispatch a custom event the child can listen for
                abatementCmp.dispatchEvent(new CustomEvent('addpartner', { bubbles: true, composed: true }));
            }
        }
    }
}