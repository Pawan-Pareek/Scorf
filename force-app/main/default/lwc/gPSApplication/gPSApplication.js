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

    @track budgetInformationData = {};

    // Partners array to store all partner data
@track partners = [];
@track currentPartnerIndex = 0;

// Store technical proposal data separately
@track technicalProposalData = {};

// Arrays to store returned IDs from Salesforce
@track abatementStrategiesIds = [];
@track strategyLineItemIds = [];
@track strategyResourcesIds = [];

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
// Replace the existing handleDataChange method with this updated version
handleDataChange(event) {
    const { stepData, stepType } = event.detail;
    
    if (stepType === 'organization') {
        console.log('Data received from organizationInformation child:', JSON.stringify(stepData));
        this.organizationData = { ...stepData };
    }
    
    // Add this new condition for technical proposal
    if (stepType === 'technicalProposal') {
        console.log('Data received from technicalProposal child:', JSON.stringify(stepData));
        this.technicalProposalData = { ...stepData };
    }
    
    // Log all abatement-related data received from child
    try {
        const { abatementStrategies, personnelData, budgetData, stepType } = event.detail;
        console.log('Abatement Data Received - abatementStrategies:', JSON.stringify(abatementStrategies));
        console.log('Abatement Data Received - personnelData:', JSON.stringify(personnelData));
        console.log('Abatement Data Received - budgetData:', JSON.stringify(budgetData));
        console.log('Abatement Data Received - stepType:', stepType);
        
        if (stepType === 'abatementStrategies') {
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
            
            if (abatementStrategies && abatementStrategies.strategyLineResources) {
                this.strategyLineResourcesData = { ...abatementStrategies.strategyLineResources };
                console.log('strategyLineResourcesData assigned in parent:', JSON.stringify(this.strategyLineResourcesData));
            }

            if (stepType === 'budgetInformation') {
                console.log('Data received from budgetInformation child:', JSON.stringify(stepData));
                this.budgetInformationData = { ...stepData };
            }
            
            console.log('Updated abatementStrategiesData:', JSON.stringify(this.abatementStrategiesData));
            console.log('Updated abatementExtraData:', JSON.stringify(this.abatementExtraData));
            console.log('Updated strategyLineResourcesData:', JSON.stringify(this.strategyLineResourcesData));
        }
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
                    
                    // Check if there's current partner data that needs to be added
                    this.addCurrentPartnerIfExists();
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
                    // Add console logs for debugging
                    console.log('Passing strategyLineResourcesData to child:', JSON.stringify(this.strategyLineResourcesData));
                    console.log('Passing abatementStrategiesData to child:', JSON.stringify(this.abatementStrategiesData));
                    console.log('Passing abatementExtraData to child:', JSON.stringify(this.abatementExtraData));
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
        
        // If we're in step 3, add current partner data before saving
        if (this.currentStep === 3) {
            this.addCurrentPartnerIfExists();
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

    // Add this after getting organization data
const partnersData = this.getAllPartnersData();
console.log('All partners data:', JSON.stringify(partnersData));
    this.isLoading = true;
    
    // Save organization information first
    this.saveOrganizationData()
        .then(() => {
            // Then save abatement strategies
            return this.saveAllPartnersData();
        })
        .then(() => {
            console.log('Final IDs stored:');
            console.log('abatementStrategiesIds:', this.abatementStrategiesIds);
            console.log('strategyLineItemIds:', this.strategyLineItemIds);
            console.log('strategyResourcesIds:', this.strategyResourcesIds);
            this.showToast('Success', 'Application saved successfully', 'success');
            this.isLoading = false;
        })
        .catch(error => {
            console.error('Error in saveAllApplicationData:', error);
            this.showToast('Error', 'Failed to save application', 'error');
            this.isLoading = false;
        });
}

saveAllPartnersData() {
    // Get all partners data including current partner if it exists
    const allPartnersData = this.getAllPartnersData();
    
    if (!allPartnersData.partners || allPartnersData.partners.length === 0) {
        return Promise.resolve();
    }

    // Process partners sequentially
    let promise = Promise.resolve();
    
    allPartnersData.partners.forEach((partner, index) => {
        promise = promise.then(() => {
            return this.savePartnerData(partner, index);
        });
    });
    
    return promise;
}

savePartnerData(partner, partnerIndex) {
    console.log(`Saving partner ${partnerIndex}:`, JSON.stringify(partner));
    
    // Prepare Abatement_Strategies__c data
    const abatementData = {
        Funding_Application__c: this.recordId,
        ...partner.technicalProposal,
        CoreStrategies__c: partner.abatementStrategies.CoreStrategies__c,
        Core_Abatement_Strategies__c: partner.abatementStrategies.Core_Abatement_Strategies__c
    };

    console.log('Calling saveAbatementStrategies for partner', partnerIndex, ':', JSON.stringify(abatementData));
    
    return saveAbatementStrategies({ abatement: JSON.stringify(abatementData) })
        .then(result => {
            if (result && result.success && result.record && result.record.Id) {
                const abatementId = result.record.Id;
                this.abatementStrategiesIds.push(abatementId);
                
                console.log(`Abatement strategy saved for partner ${partnerIndex}, ID: ${abatementId}`);
                
                // Save Strategy Line Items
                const lineItemsPromise = this.savePartnerStrategyLineItems(partner, abatementId, partnerIndex);
                
                // Save Strategy Resources 
                const resourcesPromise = this.savePartnerStrategyResources(partner, abatementId, partnerIndex);
                
                return Promise.all([lineItemsPromise, resourcesPromise]);
            } else {
                throw new Error(`Failed to save abatement strategy for partner ${partnerIndex}`);
            }
        });
}

savePartnerStrategyLineItems(partner, abatementId, partnerIndex) {
    if (!partner.strategyLineResources || Object.keys(partner.strategyLineResources).length === 0) {
        return Promise.resolve();
    }

    // Transform data for Strategy_Line_Items__c - map Strategy_Value__c to Name__c
    const transformedLineItems = {};
    Object.keys(partner.strategyLineResources).forEach(key => {
        const item = { ...partner.strategyLineResources[key] };
        // Remove Strategy_Value__c and use it for Name__c in Apex
        transformedLineItems[key] = item;
    });

    console.log(`Saving strategy line items for partner ${partnerIndex}:`, JSON.stringify(transformedLineItems));
    
    return saveStrategyLineItems({
        abatementId: abatementId,
        lineItemsJson: JSON.stringify(transformedLineItems)
    })
    .then(result => {
        if (result && result.success) {
            console.log(`Strategy line items saved for partner ${partnerIndex}`);
            if (result.insertedIds && result.insertedIds.length > 0) {
                this.strategyLineItemIds.push(...result.insertedIds);
            }
        } else {
            throw new Error(`Failed to save strategy line items for partner ${partnerIndex}`);
        }
    });
}

savePartnerStrategyResources(partner, abatementId, partnerIndex) {
    if (!partner.abatementExtra || 
        (!partner.abatementExtra.personnelData || Object.keys(partner.abatementExtra.personnelData).length === 0) &&
        (!partner.abatementExtra.budgetData || Object.keys(partner.abatementExtra.budgetData).length === 0)) {
        return Promise.resolve();
    }

    const resourcesToSave = [];
    
    // Personnel Data
    if (partner.abatementExtra.personnelData) {
        Object.keys(partner.abatementExtra.personnelData).forEach(strategyName => {
            partner.abatementExtra.personnelData[strategyName].forEach(personnelRow => {
                resourcesToSave.push({
                    RecordTypeName: 'Personnel Information',
                    Strategy_Name__c: strategyName,
                    Abatement_Strategies__c: abatementId,
                    ...personnelRow
                });
            });
        });
    }
    
    // Budget Data
    if (partner.abatementExtra.budgetData) {
        Object.keys(partner.abatementExtra.budgetData).forEach(strategyName => {
            partner.abatementExtra.budgetData[strategyName].forEach(budgetRow => {
                resourcesToSave.push({
                    RecordTypeName: 'Budget Information',
                    Strategy_Name__c: strategyName,
                    Abatement_Strategies__c: abatementId,
                    ...budgetRow
                });
            });
        });
    }

    if (resourcesToSave.length === 0) {
        return Promise.resolve();
    }

    console.log(`Saving strategy resources for partner ${partnerIndex}:`, JSON.stringify(resourcesToSave));
    
    return saveStrategyResources({ resourcesJson: JSON.stringify(resourcesToSave) })
        // Replace the success handling part in savePartnerStrategyResources
.then(result => {
    if (result && result.success) {
        console.log(`Strategy resources saved for partner ${partnerIndex}`);
        if (result.insertedIds && result.insertedIds.length > 0) {
            this.strategyResourcesIds.push(...result.insertedIds);
        }
    } else {
        throw new Error(`Failed to save strategy resources for partner ${partnerIndex}: ${result.error}`);
    }
});
}

// Add these new methods
saveOrganizationData() {
    console.log('saveOrganizationData START');
    
    // Get the latest budget data from step 4 component
    const budgetComponent = this.template.querySelector('c-budget-information[data-step="4"]');
    if (budgetComponent && typeof budgetComponent.getData === 'function') {
        this.budgetInformationData = { ...budgetComponent.getData() };
    }
    
    // Merge organization data with budget data for the same Funding_Application__c record
    const combinedApplicationData = {
        ...this.organizationData,
        ...this.budgetInformationData,
        Id: this.recordId // Include record ID if updating
    };
    
    console.log('Combined Funding Application data to be sent to Apex:', JSON.stringify(combinedApplicationData));
    
    if (Object.keys(combinedApplicationData).length === 0) {
        return Promise.resolve();
    }
    
    return saveApplication({ application: combinedApplicationData })
        .then(result => {
            this.recordId = result.Id; // Update recordId for subsequent saves
            console.log('Funding Application saved with ID:', result.Id);
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

    // Replace the existing step2Data getter with this
get step2Data() { 
    return { ...this.applicationData, ...this.technicalProposalData }; 
}

get step3Data() { 
    // Only return clean abatement data, don't include any leftover abatement fields from applicationData
    const cleanApplicationData = { ...this.applicationData };
    
    // Remove any abatement-specific fields that might be lingering in applicationData
    delete cleanApplicationData.coreStrategies;
    delete cleanApplicationData.abatementStrategies;
    delete cleanApplicationData.CoreStrategies__c;
    delete cleanApplicationData.Core_Abatement_Strategies__c;
    delete cleanApplicationData.strategyLineResources;
    delete cleanApplicationData.personnelData;
    delete cleanApplicationData.budgetData;
    
    const data = { 
        ...cleanApplicationData, // Only organization data
        ...this.abatementStrategiesData, 
        ...this.abatementExtraData 
    }; 
    return data; 
}

get step4Data() { 
    return { ...this.applicationData, ...this.budgetInformationData }; 
}

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

    // Replace the existing     Partner method (around line 350) with this:
handleAddPartner() {
    try {
        this.saveCurrentStepData();
        
        // Get the latest data from Technical Proposal component
        const techComponent = this.template.querySelector('c-technical-proposal[data-step="2"]');
        if (techComponent && typeof techComponent.getData === 'function') {
            this.technicalProposalData = { ...techComponent.getData() };
        }
        
        // Get the latest data from Abatement Strategies component
        const abatementComponent = this.template.querySelector('c-abatement-strategies[data-step="3"]');
        if (abatementComponent && typeof abatementComponent.getData === 'function') {
            const abatementData = abatementComponent.getData();
            this.abatementStrategiesData = { ...abatementData };
            
            // LOG ALL VARIABLES FROM ABATEMENT STRATEGIES COMPONENT HERE
            // console.log('=== ABATEMENT STRATEGIES VARIABLES BEFORE ADDING PARTNER ===');
            // if (typeof abatementComponent.handleAddPartnerFromParent === 'function') {
            //     console.log('Calling handleAddPartnerFromParent to log variables...');
            //     abatementComponent.handleAddPartnerFromParent();
            // } else {
            //     console.log('handleAddPartnerFromParent method not available, logging manually:');
            //     // Manual logging if method not available
            //     console.log('abatementComponent.applicationData:', JSON.stringify(abatementComponent.applicationData));
            //     console.log('abatementComponent.picklistValues:', JSON.stringify(abatementComponent.picklistValues));
            //     console.log('abatementComponent.recordId:', abatementComponent.recordId);
            //     console.log('abatementComponent.strategyLineResourcesData:', JSON.stringify(abatementComponent.strategyLineResourcesData));
            //     console.log('abatementComponent.coreStrategies:', JSON.stringify(abatementComponent.coreStrategies));
            //     console.log('abatementComponent.mappedAbatementStrategies:', JSON.stringify(abatementComponent.mappedAbatementStrategies));
            //     console.log('abatementComponent.selectedCoreStrategies:', JSON.stringify(abatementComponent.selectedCoreStrategies));
            //     console.log('abatementComponent.selectedAbatementStrategies:', JSON.stringify(abatementComponent.selectedAbatementStrategies));
            //     console.log('abatementComponent.expandedStrategies:', JSON.stringify(Array.from(abatementComponent.expandedStrategies || [])));
            //     console.log('abatementComponent.isLoading:', abatementComponent.isLoading);
            //     console.log('abatementComponent.hasError:', abatementComponent.hasError);
            //     console.log('abatementComponent.errorMessage:', abatementComponent.errorMessage);
            //     console.log('abatementComponent.componentData:', JSON.stringify(abatementComponent.componentData));
            //     console.log('abatementComponent.abatementOptionDataMap:', JSON.stringify(abatementComponent.abatementOptionDataMap));
            //     console.log('abatementComponent.personnelData:', JSON.stringify(abatementComponent.personnelData));
            //     console.log('abatementComponent.budgetData:', JSON.stringify(abatementComponent.budgetData));
            //     console.log('abatementComponent.personnelRows:', JSON.stringify(abatementComponent.personnelRows));
            // }
        }

        // FIXED: Only store selected strategies for this partner
        const selectedAbatementStrategies = this.abatementStrategiesData.abatementStrategies || [];
        const selectedCoreStrategies = this.abatementStrategiesData.coreStrategies || [];
        
        // Filter strategy line resources to only include selected ones
        const filteredStrategyLineResources = {};
        const filteredPersonnelData = {};
        const filteredBudgetData = {};
        
        selectedAbatementStrategies.forEach(strategyKey => {
            if (this.strategyLineResourcesData[strategyKey]) {
                filteredStrategyLineResources[strategyKey] = this.strategyLineResourcesData[strategyKey];
            }
            if (this.abatementExtraData.personnelData && this.abatementExtraData.personnelData[strategyKey]) {
                filteredPersonnelData[strategyKey] = this.abatementExtraData.personnelData[strategyKey];
            }
            if (this.abatementExtraData.budgetData && this.abatementExtraData.budgetData[strategyKey]) {
                filteredBudgetData[strategyKey] = this.abatementExtraData.budgetData[strategyKey];
            }
        });

        // Create partner object with ONLY selected data
        const partnerData = {
            partnerIndex: this.currentPartnerIndex,
            technicalProposal: { ...this.technicalProposalData },
            abatementStrategies: {
                coreStrategies: selectedCoreStrategies,
                abatementStrategies: selectedAbatementStrategies,
                CoreStrategies__c: selectedCoreStrategies.join(';'),
                Core_Abatement_Strategies__c: selectedAbatementStrategies.join(';')
            },
            strategyLineResources: filteredStrategyLineResources,
            abatementExtra: {
                personnelData: filteredPersonnelData,
                budgetData: filteredBudgetData
            }
        };
        
        // Add to partners array
        this.partners.push(partnerData);
        this.currentPartnerIndex++;
        
        console.log('Partner added:', JSON.stringify(partnerData));
        console.log('All Partners Data:', JSON.stringify(this.partners));
        
        // Reset data for new partner
        this.resetPartnerData();
        
        // LOG ALL VARIABLES FROM ABATEMENT STRATEGIES COMPONENT AFTER RESET
        console.log('=== ABATEMENT STRATEGIES VARIABLES AFTER RESET ===');
        const abatementComponentAfterReset = this.template.querySelector('c-abatement-strategies[data-step="3"]');
        if (abatementComponentAfterReset) {
            console.log('abatementComponentAfterReset.applicationData:', JSON.stringify(abatementComponentAfterReset.applicationData));
            console.log('abatementComponentAfterReset.picklistValues:', JSON.stringify(abatementComponentAfterReset.picklistValues));
            console.log('abatementComponentAfterReset.recordId:', abatementComponentAfterReset.recordId);
            console.log('abatementComponentAfterReset.strategyLineResourcesData:', JSON.stringify(abatementComponentAfterReset.strategyLineResourcesData));
            console.log('abatementComponentAfterReset.coreStrategies:', JSON.stringify(abatementComponentAfterReset.coreStrategies));
            console.log('abatementComponentAfterReset.mappedAbatementStrategies:', JSON.stringify(abatementComponentAfterReset.mappedAbatementStrategies));
            console.log('abatementComponentAfterReset.selectedCoreStrategies:', JSON.stringify(abatementComponentAfterReset.selectedCoreStrategies));
            console.log('abatementComponentAfterReset.selectedAbatementStrategies:', JSON.stringify(abatementComponentAfterReset.selectedAbatementStrategies));
            console.log('abatementComponentAfterReset.expandedStrategies:', JSON.stringify(Array.from(abatementComponentAfterReset.expandedStrategies || [])));
            console.log('abatementComponentAfterReset.isLoading:', abatementComponentAfterReset.isLoading);
            console.log('abatementComponentAfterReset.hasError:', abatementComponentAfterReset.hasError);
            console.log('abatementComponentAfterReset.errorMessage:', abatementComponentAfterReset.errorMessage);
            console.log('abatementComponentAfterReset.componentData:', JSON.stringify(abatementComponentAfterReset.componentData));
            console.log('abatementComponentAfterReset.abatementOptionDataMap:', JSON.stringify(abatementComponentAfterReset.abatementOptionDataMap));
            console.log('abatementComponentAfterReset.personnelData:', JSON.stringify(abatementComponentAfterReset.personnelData));
            console.log('abatementComponentAfterReset.budgetData:', JSON.stringify(abatementComponentAfterReset.budgetData));
            console.log('abatementComponentAfterReset.personnelRows:', JSON.stringify(abatementComponentAfterReset.personnelRows));
        } else {
            console.log('abatementComponentAfterReset not found in DOM after reset');
        }
        
        // Navigate to Technical Proposal step (Step 2)
        this.currentStep = 2;
        this.updateStepStyles(); 
        
        // Show success message
        this.showToast('Success', `Partner ${this.partners.length} added successfully. Now entering data for partner ${this.currentPartnerIndex + 1}.`, 'success');
        
    } catch (error) {
        console.error('Error adding partner:', error);
        this.showToast('Error', 'Failed to add partner', 'error');
    }
}

// Add current partner data if it exists (called when moving from step 3 to step 4)
addCurrentPartnerIfExists() {
    try {
        // Get the latest data from Technical Proposal component
        const techComponent = this.template.querySelector('c-technical-proposal[data-step="2"]');
        if (techComponent && typeof techComponent.getData === 'function') {
            this.technicalProposalData = { ...techComponent.getData() };
        }
        
        // Get the latest data from Abatement Strategies component
        const abatementComponent = this.template.querySelector('c-abatement-strategies[data-step="3"]');
        if (abatementComponent && typeof abatementComponent.getData === 'function') {
            const abatementData = abatementComponent.getData();
            this.abatementStrategiesData = { ...abatementData };
        }

        // Check if there's actual data to add (not empty forms)
        const hasTechnicalData = this.technicalProposalData && 
            (this.technicalProposalData.PartnerName__c || 
             this.technicalProposalData.GeographicAreaPopulationPoverty__c || 
             this.technicalProposalData.Outline_Existing_Efforts_and_New_Expansi__c || 
             this.technicalProposalData.Describe_Current_Budget_and_Funding_Sour__c);
             
        const hasAbatementData = this.abatementStrategiesData && 
            (this.abatementStrategiesData.abatementStrategies || 
             this.abatementStrategiesData.coreStrategies);

        // Only add partner if there's actual data
        if (hasTechnicalData || hasAbatementData) {
            // FIXED: Only store selected strategies for this partner
            const selectedAbatementStrategies = this.abatementStrategiesData.abatementStrategies || [];
            const selectedCoreStrategies = this.abatementStrategiesData.coreStrategies || [];
            
            // Filter strategy line resources to only include selected ones
            const filteredStrategyLineResources = {};
            const filteredPersonnelData = {};
            const filteredBudgetData = {};
            
            selectedAbatementStrategies.forEach(strategyKey => {
                if (this.strategyLineResourcesData[strategyKey]) {
                    filteredStrategyLineResources[strategyKey] = this.strategyLineResourcesData[strategyKey];
                }
                if (this.abatementExtraData.personnelData && this.abatementExtraData.personnelData[strategyKey]) {
                    filteredPersonnelData[strategyKey] = this.abatementExtraData.personnelData[strategyKey];
                }
                if (this.abatementExtraData.budgetData && this.abatementExtraData.budgetData[strategyKey]) {
                    filteredBudgetData[strategyKey] = this.abatementExtraData.budgetData[strategyKey];
                }
            });

            // Create partner object with ONLY selected data
            const partnerData = {
                partnerIndex: this.currentPartnerIndex,
                technicalProposal: { ...this.technicalProposalData },
                abatementStrategies: {
                    coreStrategies: selectedCoreStrategies,
                    abatementStrategies: selectedAbatementStrategies,
                    CoreStrategies__c: selectedCoreStrategies.join(';'),
                    Core_Abatement_Strategies__c: selectedAbatementStrategies.join(';')
                },
                strategyLineResources: filteredStrategyLineResources,
                abatementExtra: {
                    personnelData: filteredPersonnelData,
                    budgetData: filteredBudgetData
                }
            };
            
            // Add to partners array
            this.partners.push(partnerData);
            this.currentPartnerIndex++;
            
            console.log('Partner added via Next button:', JSON.stringify(partnerData));
            console.log('All Partners Data:', JSON.stringify(this.partners));
            
            // Show success message
            this.showToast('Success', `Partner ${this.partners.length} added automatically when moving to next step.`, 'success');
        }
        
    } catch (error) {
        console.error('Error adding current partner:', error);
        this.showToast('Error', 'Failed to add current partner data', 'error');
    }
}

// Reset partner-specific data
// Replace the existing resetPartnerData method with this:
resetPartnerData() {
    console.log('resetPartnerData called');
    this.technicalProposalData = {};
    this.abatementStrategiesData = {};
    this.strategyLineResourcesData = {};
    this.abatementExtraData = {};

    // Also clear abatement-related fields from applicationData while preserving organization data
const cleanedApplicationData = { ...this.applicationData };
delete cleanedApplicationData.coreStrategies;
delete cleanedApplicationData.abatementStrategies;
delete cleanedApplicationData.CoreStrategies__c;
delete cleanedApplicationData.Core_Abatement_Strategies__c;
delete cleanedApplicationData.strategyLineResources;
delete cleanedApplicationData.personnelData;
delete cleanedApplicationData.budgetData;

this.applicationData = cleanedApplicationData;
    
    // Clear the child components with a small delay to ensure proper clearing
    setTimeout(() => {
        this.clearChildComponentForms();
        // Notify child components after clearing
        setTimeout(() => {
            this.notifyChildComponents();
        }, 100);
    }, 50);
}

// Clear forms in child components
clearChildComponentForms() {
    console.log('clearChildComponentForms called');
    
    // Clear Technical Proposal form
    const techComponent = this.template.querySelector('c-technical-proposal[data-step="2"]');
    if (techComponent && typeof techComponent.clearData === 'function') {
        techComponent.clearData();
    }
    
    // Clear Abatement Strategies form with force refresh
    const abatementComponent = this.template.querySelector('c-abatement-strategies[data-step="3"]');
    console.log('abatementComponent found:', abatementComponent);
    console.log('abatementComponent type:', typeof abatementComponent);
    
    if (abatementComponent) {
        console.log('abatementComponent methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(abatementComponent)));
        console.log('handleAddPartnerFromParent exists:', typeof abatementComponent.handleAddPartnerFromParent);
        
        // Call handleAddPartnerFromParent to log variables before clearing
        if (typeof abatementComponent.handleAddPartnerFromParent === 'function') {
            console.log('Calling handleAddPartnerFromParent on abatementStrategies component');
            try {
                abatementComponent.handleAddPartnerFromParent();
                console.log('handleAddPartnerFromParent called successfully');
            } catch (error) {
                console.error('Error calling handleAddPartnerFromParent:', error);
            }
        } else {
            console.log('handleAddPartnerFromParent method not found on abatementComponent');
        }
        
        // Clear the component data properly
        if (typeof abatementComponent.clearData === 'function') {
            abatementComponent.clearData();
        }
        
        setTimeout(() => {
            if (typeof abatementComponent.setData === 'function') {
                // Create clean data object with only organization info
                const cleanedApplicationData = { ...this.applicationData };
                
                // Remove abatement-specific fields from applicationData
                delete cleanedApplicationData.coreStrategies;
                delete cleanedApplicationData.abatementStrategies;
                delete cleanedApplicationData.CoreStrategies__c;
                delete cleanedApplicationData.Core_Abatement_Strategies__c;
                delete cleanedApplicationData.strategyLineResources;
                delete cleanedApplicationData.personnelData;
                delete cleanedApplicationData.budgetData;
                
                const emptyAbatementData = {
                    ...cleanedApplicationData, // Keep organization info only
                    coreStrategies: [],
                    abatementStrategies: [],
                    CoreStrategies__c: '',
                    Core_Abatement_Strategies__c: '',
                    strategyLineResources: {},
                    personnelData: {},
                    budgetData: {}
                };
                
                console.log('Setting empty abatement data:', JSON.stringify(emptyAbatementData));
                abatementComponent.setData(emptyAbatementData);
                
                // Also clear the strategyLineResourcesData property directly
                if (abatementComponent.strategyLineResourcesData) {
                    abatementComponent.strategyLineResourcesData = {};
                }
            }
        }, 100);
    } else {
        console.log('abatementComponent not found in DOM');
    }
}

// Get all partners data for saving
getAllPartnersData() {
    // Check if there's current partner data that hasn't been added yet
    let allPartners = [...this.partners];
    
    // If we're in step 3 and there's current data, include it
    if (this.currentStep === 3) {
        const currentPartnerData = this.getCurrentPartnerData();
        if (currentPartnerData) {
            allPartners.push(currentPartnerData);
        }
    }
    
    return {
        partners: allPartners,
        currentPartnerIndex: this.currentPartnerIndex,
        totalPartners: allPartners.length
    };
}

// Get current partner data if it exists
getCurrentPartnerData() {
    try {
        // Get the latest data from Technical Proposal component
        const techComponent = this.template.querySelector('c-technical-proposal[data-step="2"]');
        let technicalData = {};
        if (techComponent && typeof techComponent.getData === 'function') {
            technicalData = { ...techComponent.getData() };
        }
        
        // Get the latest data from Abatement Strategies component
        const abatementComponent = this.template.querySelector('c-abatement-strategies[data-step="3"]');
        let abatementData = {};
        if (abatementComponent && typeof abatementComponent.getData === 'function') {
            abatementData = { ...abatementComponent.getData() };
        }

        // Check if there's actual data to return (not empty forms)
        const hasTechnicalData = technicalData && 
            (technicalData.PartnerName__c || 
             technicalData.GeographicAreaPopulationPoverty__c || 
             technicalData.Outline_Existing_Efforts_and_New_Expansi__c || 
             technicalData.Describe_Current_Budget_and_Funding_Sour__c);
             
        const hasAbatementData = abatementData && 
            (abatementData.abatementStrategies || 
             abatementData.coreStrategies);

        // Only return partner data if there's actual data
        if (hasTechnicalData || hasAbatementData) {
            // FIXED: Only store selected strategies for this partner
            const selectedAbatementStrategies = abatementData.abatementStrategies || [];
            const selectedCoreStrategies = abatementData.coreStrategies || [];
            
            // Filter strategy line resources to only include selected ones
            const filteredStrategyLineResources = {};
            const filteredPersonnelData = {};
            const filteredBudgetData = {};
            
            selectedAbatementStrategies.forEach(strategyKey => {
                if (this.strategyLineResourcesData[strategyKey]) {
                    filteredStrategyLineResources[strategyKey] = this.strategyLineResourcesData[strategyKey];
                }
                if (this.abatementExtraData.personnelData && this.abatementExtraData.personnelData[strategyKey]) {
                    filteredPersonnelData[strategyKey] = this.abatementExtraData.personnelData[strategyKey];
                }
                if (this.abatementExtraData.budgetData && this.abatementExtraData.budgetData[strategyKey]) {
                    filteredBudgetData[strategyKey] = this.abatementExtraData.budgetData[strategyKey];
                }
            });

            // Create partner object with ONLY selected data
            return {
                partnerIndex: this.currentPartnerIndex,
                technicalProposal: { ...technicalData },
                abatementStrategies: {
                    coreStrategies: selectedCoreStrategies,
                    abatementStrategies: selectedAbatementStrategies,
                    CoreStrategies__c: selectedCoreStrategies.join(';'),
                    Core_Abatement_Strategies__c: selectedAbatementStrategies.join(';')
                },
                strategyLineResources: filteredStrategyLineResources,
                abatementExtra: {
                    personnelData: filteredPersonnelData,
                    budgetData: filteredBudgetData
                }
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('Error getting current partner data:', error);
        return null;
    }
}
    
}