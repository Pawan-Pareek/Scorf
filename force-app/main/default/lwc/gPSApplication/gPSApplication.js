// GPS Application Component - Cleaned Version
// Removed unused imports, methods, and properties

import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Apex methods from the controller
import getPicklistValues from '@salesforce/apex/GPSApplicationController.getPicklistValues';
import saveApplication from '@salesforce/apex/GPSApplicationController.saveApplication';
import getApplication from '@salesforce/apex/GPSApplicationController.getApplication';
import saveAbatementStrategies from '@salesforce/apex/GPSApplicationController.saveAbatementStrategies';
import saveStrategyLineItems from '@salesforce/apex/GPSApplicationController.saveStrategyLineItems';
import saveStrategyResources from '@salesforce/apex/GPSApplicationController.saveStrategyResources';
import getStrategyResources from '@salesforce/apex/GPSApplicationController.getStrategyResources';
import deleteAbatementStrategyAndChildren from '@salesforce/apex/GPSApplicationController.deleteAbatementStrategyAndChildren';

// Static resource for logo
import gpsLogo from '@salesforce/resourceUrl/ScorfBanner';

export default class GpsApplication extends LightningElement {
    // Set logo from static resource
    logoUrl = gpsLogo;
    
    // Public property to hold the record ID passed from parent
    @api recordId;

    // Reactive tracked properties
    @track applicationData = {};
    @track picklistValues = {};
    @track isLoading = true;
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

    // Store each step data
    @track organizationData = {};
    @track abatementStrategiesData = {};
    @track strategyLineResourcesData = {};
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

    // Flag to track if current partner data has been added to partners array
    @track isCurrentPartnerAdded = false;

    // Preview Modal properties
    @track showPreviewModal = false;
    @track previewData = {};
    @track showPartnerViewModal = false;
    @track selectedPartnerData = {};
    @track editingPartnerIndex = -1;
    @track isEditingExistingPartner = false;

    // Budget Information properties
    @track consentChecked = false;

    // Handler for bubbling event from strategyLineResources
    handleStrategyLineResourcesChange(event) {
        const { strategyValue, data } = event.detail;
        this.strategyLineResourcesData = {
            ...this.strategyLineResourcesData,
            [strategyValue]: data
        };
    }

    // Handler for strategy clear events from abatement strategies component
    handleStrategyClear(event) {
        const { clearedStrategies } = event.detail;
        
        console.log('Strategy clear event received:', { clearedStrategies });
        
        // Check if current partner data exists in partners array and clear the corresponding data
        if (this.partners.length > 0 && this.isCurrentPartnerAdded) {
            // Find the current partner being edited
            const currentPartnerIndex = this.editingPartnerIndex >= 0 ? this.editingPartnerIndex : this.partners.length - 1;
            const currentPartner = this.partners[currentPartnerIndex];
            
            if (currentPartner && currentPartner.strategyLineResources) {
                // Clear strategy line resources data for the cleared strategies
                const updatedStrategyLineResources = { ...currentPartner.strategyLineResources };
                clearedStrategies.forEach(strategy => {
                    if (updatedStrategyLineResources[strategy]) {
                        delete updatedStrategyLineResources[strategy];
                    }
                });
                
                // Update the partner's strategy line resources
                this.partners[currentPartnerIndex] = {
                    ...currentPartner,
                    strategyLineResources: updatedStrategyLineResources
                };
                
                console.log('Updated partner strategy line resources after clear:', this.partners[currentPartnerIndex]);
            }
        }
    }

    // Partner Table Methods
    handleViewPartner(event) {
        const partnerIndex = event.target.dataset.index;
        this.selectedPartnerData = this.partners[partnerIndex];
        this.showPartnerViewModal = true;
    }

    handleEditPartner(event) {
        const partnerIndex = parseInt(event.target.dataset.index);
        this.editingPartnerIndex = partnerIndex;
        this.isEditingExistingPartner = true;
        
        // Reset the flag since we're editing existing partner data
        this.isCurrentPartnerAdded = false;
        
        // Load partner data into form
        const partnerToEdit = this.partners[partnerIndex];
        
        // Set technical proposal data
        this.technicalProposalData = { ...partnerToEdit.technicalProposal };
        
        // Set abatement strategies data
        this.abatementStrategiesData = { ...partnerToEdit.abatementStrategies };
        this.strategyLineResourcesData = { ...partnerToEdit.strategyLineResources };
        this.abatementExtraData = { ...partnerToEdit.abatementExtra };
        
        // Navigate to step 2
        this.currentStep = 2;
        this.updateStepStyles();
        
        this.showToast('Info', `Now editing partner: ${partnerToEdit.technicalProposal.PartnerName__c}`, 'info');
    }

    async handleDeletePartner(event) {
        const partnerIndex = parseInt(event.target.dataset.index);
        const partner = this.partners[partnerIndex];
        const partnerName = partner.technicalProposal.PartnerName__c;
        
        console.log('Deleting partner at index:', partnerIndex);
        console.log('Partner to delete:', partner);
        console.log('Partners array before deletion:', this.partners);
        
        try {
            // Check if the partner has an abatement strategy ID (exists in Salesforce)
            if (partner.abatementStrategies && partner.abatementStrategies.Id) {
                console.log('Partner has existing abatement strategy in Salesforce. Deleting from Salesforce first...');
                
                // Delete from Salesforce first
                const deleteResult = await deleteAbatementStrategyAndChildren({ 
                    abatementStrategyId: partner.abatementStrategies.Id 
                });
                
                if (deleteResult.success) {
                    console.log('Successfully deleted from Salesforce:', deleteResult.message);
                    this.showToast('Success', `Partner "${partnerName}" and all related records deleted from Salesforce successfully`, 'success');
                } else {
                    console.error('Failed to delete from Salesforce:', deleteResult.error);
                    this.showToast('Warning', `Partner "${partnerName}" removed from form but failed to delete from Salesforce: ${deleteResult.error}`, 'warning');
                }
            } else {
                console.log('Partner does not exist in Salesforce. Removing from form only.');
                this.showToast('Success', `Partner "${partnerName}" removed from form successfully`, 'success');
            }
            
            // Remove partner from array
            this.partners.splice(partnerIndex, 1);
            
            console.log('Partners array after deletion:', this.partners);
            console.log('Total partners count after deletion:', this.partners.length);
            
        } catch (error) {
            console.error('Error deleting partner:', error);
            this.showToast('Error', `Failed to delete partner "${partnerName}": ${error.message}`, 'error');
        }

        // Single log for final partners array state
        console.log('FINAL PARTNERS ARRAY:', JSON.stringify(this.partners));
    }

    handleClosePartnerModal() {
        this.showPartnerViewModal = false;
        this.selectedPartnerData = {};
    }

    // Get partner table data for display
    get partnerTableData() {
        return this.partners.map((partner, index) => ({
            id: index,
            name: partner.technicalProposal.PartnerName__c || `Partner ${index + 1}`,
            index: index
        }));
    }

    // Check if there's only one partner to disable delete button
    get isOnlyOnePartner() {
        return this.partners.length <= 1;
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
                if (result) {
                    this.applicationData = { ...result };
                    
                    // Extract budget information data from the loaded application data
                    this.budgetInformationData = {
                        Total_Project_Budget__c: result.Total_Project_Budget__c || '',
                        MinusEstimatedCarryForwardAmount__c: result.MinusEstimatedCarryForwardAmount__c || '',
                        MinusEstimatedInterestEarned__c: result.MinusEstimatedInterestEarned__c || '',
                        Total_Amount_Requested__c: result.Total_Amount_Requested__c || '',
                        ElectronicSignature__c: result.ElectronicSignature__c || ''
                    };
                    
                    // Load existing partners data if available
                    this.loadExistingPartnersData();
                } else {
                    this.applicationData = {};
                    this.budgetInformationData = {};
                }
                this.applicationLoaded = true;
                this.checkIfAllDataLoaded();
            })
            .catch(error => {
                this.applicationLoaded = true;
                this.applicationData = {};
                this.budgetInformationData = {};
                this.checkIfAllDataLoaded();
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
            this.picklistLoaded = true;
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
            this.notifyChildComponents();
        }
    }

    // Notify child components that data is ready
    notifyChildComponents() {
        setTimeout(() => {
            this.passDataToCurrentStep();
        }, 100);
    }

    // Handle data change from child components
    handleDataChange(event) {
        const { stepData, stepType } = event.detail;
        
        if (stepType === 'organization') {
            this.organizationData = { ...stepData };
        }
        
        if (stepType === 'technicalProposal') {
            this.technicalProposalData = { ...stepData };
            // Reset flag when user starts entering new technical proposal data
            if (this.hasCurrentFormData()) {
                this.isCurrentPartnerAdded = false;
            }
        }
        
        try {
            const { abatementStrategies, personnelData, budgetData } = event.detail;
            
            if (stepType === 'abatementStrategies') {
                this.abatementStrategiesData = { ...abatementStrategies };
                this.abatementExtraData = {
                    personnelData: personnelData || {},
                    budgetData: budgetData || {}
                };
                
                if (abatementStrategies && abatementStrategies.strategyLineResources) {
                    this.strategyLineResourcesData = { ...abatementStrategies.strategyLineResources };
                }
                
                // Reset flag when user starts entering new abatement strategies data
                if (this.hasCurrentFormData()) {
                    this.isCurrentPartnerAdded = false;
                }
            }

            if (stepType === 'budgetInformation') {
                this.budgetInformationData = { ...stepData };
            }
        } catch (error) {
            this.showToast('Error', 'Failed to update form data', 'error');
        }
    }

    // Check if current form has any data
    hasCurrentFormData() {
        const hasTechnicalData = this.technicalProposalData && 
            (this.technicalProposalData.PartnerName__c || 
             this.technicalProposalData.GeographicAreaPopulationPoverty__c || 
             this.technicalProposalData.Outline_Existing_Efforts_and_New_Expansi__c || 
             this.technicalProposalData.Describe_Current_Budget_and_Funding_Sour__c);
             
        const hasAbatementData = this.abatementStrategiesData && 
            (this.abatementStrategiesData.abatementStrategies || 
             this.abatementStrategiesData.coreStrategies);
             
        return hasTechnicalData || hasAbatementData;
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
                    // Only add if not already added
                    if (!this.isCurrentPartnerAdded) {
                        this.addCurrentPartnerIfExists();
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
                // Reset expanded state in abatement-strategies before leaving step 3
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
                if (this.currentStep === 4) {
                    // For step 4, save to budgetInformationData
                    this.budgetInformationData = {
                        ...this.budgetInformationData,
                        ...stepData
                    };
                } else {
                    // For other steps, save to applicationData
                    this.applicationData = {
                        ...this.applicationData,
                        ...stepData
                    };
                }
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
                    currentStepComponent.setData(dataToPass);
                } else if (this.currentStep === 4) {
                    // For step 4, use step4Data which includes both applicationData and budgetInformationData
                    console.log('Setting data for step 4 with step4Data:', this.step4Data);
                    currentStepComponent.setData(this.step4Data);
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
            // Only add if not already added
            if (this.currentStep === 3 && !this.isCurrentPartnerAdded) {
                this.addCurrentPartnerIfExists();
            }
            
            this.saveCurrentStepData();
            this.saveAllApplicationData();
        } catch (error) {
            this.showToast('Error', 'Failed to save application', 'error');
        }
    }

    // Save all application data
    saveAllApplicationData() {
        // Before saving, get the latest data from the child
        const orgComponent = this.template.querySelector('c-organization-information[data-step="1"]');
        if (orgComponent && typeof orgComponent.getData === 'function') {
            this.organizationData = { ...orgComponent.getData() };
        }

        // If we're in step 3, add current partner data before saving
        // Only add if not already added
        if (this.currentStep === 3 && !this.isCurrentPartnerAdded) {
            this.addCurrentPartnerIfExists();
        }

        this.isLoading = true;
        
        // Save organization information first
        this.saveOrganizationData()
            .then(() => {
                // Then save abatement strategies
                return this.saveAllPartnersData();
            })
            .then(() => {
                // Debug the final state after saving
                this.debugPartnersState();
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
        // Use the actual partners array instead of getting a copy
        if (!this.partners || this.partners.length === 0) {
            return Promise.resolve();
        }

        console.log('Before saving - Partners array:', JSON.stringify(this.partners));

        // Process partners sequentially
        let promise = Promise.resolve();
        
        this.partners.forEach((partner, index) => {
            promise = promise.then(() => {
                return this.savePartnerData(partner, index);
            });
        });
        
        return promise.then(() => {
            console.log('After saving - Partners array:', JSON.stringify(this.partners));
            
            // After all partners are saved, update the current abatement strategies data
            // with the latest IDs from the partners array
            if (this.partners.length > 0) {
                // Find the current partner's abatement strategies and update the component data
                const currentPartner = this.partners.find(p => p.partnerIndex === this.currentPartnerIndex - 1);
                if (currentPartner && currentPartner.abatementStrategies.Id) {
                    this.abatementStrategiesData.Id = currentPartner.abatementStrategies.Id;
                }
            }
        });
    }

    savePartnerData(partner, partnerIndex) {
        // Prepare Abatement_Strategies__c data
        const abatementData = {
            Funding_Application__c: this.recordId,
            ...partner.technicalProposal,
            CoreStrategies__c: partner.abatementStrategies.CoreStrategies__c,
            Core_Abatement_Strategies__c: partner.abatementStrategies.Core_Abatement_Strategies__c
        };
        
        // Include the ID if it exists (for updates)
        if (partner.abatementStrategies.Id) {
            abatementData.Id = partner.abatementStrategies.Id;
        }
        
        return saveAbatementStrategies({ abatement: JSON.stringify(abatementData) })
            .then(result => {
                if (result && result.success && result.record && result.record.Id) {
                    const abatementId = result.record.Id;
                    this.abatementStrategiesIds.push(abatementId);
                    
                    // Update the partner's abatement strategy ID in the partners array
                    // Find the partner by partnerIndex instead of array index
                    const partnerToUpdate = this.partners.find(p => p.partnerIndex === partner.partnerIndex);
                    if (partnerToUpdate) {
                        console.log(`Updating partner ${partner.partnerIndex} with abatement ID: ${abatementId}`);
                        partnerToUpdate.abatementStrategies.Id = abatementId;
                        // Force reactivity by creating a new array
                        this.partners = [...this.partners];
                    } else {
                        console.log(`Partner with index ${partner.partnerIndex} not found in partners array`);
                    }
                    
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

        // Transform data for Strategy_Line_Items__c
        const transformedLineItems = {};
        Object.keys(partner.strategyLineResources).forEach(key => {
            const item = { ...partner.strategyLineResources[key] };
            transformedLineItems[key] = item;
        });
        
        return saveStrategyLineItems({
            abatementId: abatementId,
            lineItemsJson: JSON.stringify(transformedLineItems)
        })
        .then(result => {
            if (result && result.success) {
                // Update strategy line resources with returned IDs
                if (result.strategyToIdMap) {
                    Object.keys(result.strategyToIdMap).forEach(strategyValue => {
                        const recordId = result.strategyToIdMap[strategyValue];
                        if (partner.strategyLineResources[strategyValue]) {
                            partner.strategyLineResources[strategyValue].Id = recordId;
                        }
                    });
                    
                    // Force reactivity by creating a new array
                    this.partners = [...this.partners];
                    
                    console.log(`Updated strategy line resources with IDs for partner ${partnerIndex}:`, result.strategyToIdMap);
                }
                
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
        const resourceIndexMap = []; // Array to track the order and type of resources being saved
        
        // Personnel Data
        if (partner.abatementExtra.personnelData) {
            Object.keys(partner.abatementExtra.personnelData).forEach(strategyName => {
                partner.abatementExtra.personnelData[strategyName].forEach((personnelRow, index) => {
                    const resourceData = {
                        RecordTypeName: 'Personnel Information',
                        Strategy_Name__c: strategyName,
                        Abatement_Strategies__c: abatementId,
                        ...personnelRow
                    };
                    resourcesToSave.push(resourceData);
                    
                    // Track this resource for ID mapping
                    resourceIndexMap.push({
                        type: 'personnel',
                        strategyName: strategyName,
                        index: index,
                        originalId: personnelRow.id || null
                    });
                });
            });
        }
        
        // Budget Data
        if (partner.abatementExtra.budgetData) {
            Object.keys(partner.abatementExtra.budgetData).forEach(strategyName => {
                partner.abatementExtra.budgetData[strategyName].forEach((budgetRow, index) => {
                    const resourceData = {
                        RecordTypeName: 'Budget Information',
                        Strategy_Name__c: strategyName,
                        Abatement_Strategies__c: abatementId,
                        ...budgetRow
                    };
                    resourcesToSave.push(resourceData);
                    
                    // Track this resource for ID mapping
                    resourceIndexMap.push({
                        type: 'budget',
                        strategyName: strategyName,
                        index: index,
                        originalId: budgetRow.id || null
                    });
                });
            });
        }

        if (resourcesToSave.length === 0) {
            return Promise.resolve();
        }
        
        return saveStrategyResources({ resourcesJson: JSON.stringify(resourcesToSave) })
            .then(result => {
                if (result && result.success) {
                    if (result.insertedIds && result.insertedIds.length > 0) {
                        this.strategyResourcesIds.push(...result.insertedIds);
                        
                        // Update the partner's abatementExtraData with the returned IDs
                        // Map the returned IDs back to the correct records
                        resourceIndexMap.forEach((resourceInfo, saveIndex) => {
                            if (saveIndex < result.insertedIds.length) {
                                const salesforceId = result.insertedIds[saveIndex];
                                
                                if (resourceInfo.type === 'personnel') {
                                    // Update personnel record with Salesforce ID
                                    if (partner.abatementExtra.personnelData[resourceInfo.strategyName]) {
                                        const personnelRecord = partner.abatementExtra.personnelData[resourceInfo.strategyName][resourceInfo.index];
                                        personnelRecord.Id = salesforceId;
                                        
                                        // If this was a new record (no original Id), remove the temporary id
                                        if (personnelRecord.id && personnelRecord.id !== salesforceId) {
                                            delete personnelRecord.id;
                                        }
                                    }
                                } else if (resourceInfo.type === 'budget') {
                                    // Update budget record with Salesforce ID
                                    if (partner.abatementExtra.budgetData[resourceInfo.strategyName]) {
                                        const budgetRecord = partner.abatementExtra.budgetData[resourceInfo.strategyName][resourceInfo.index];
                                        budgetRecord.Id = salesforceId;
                                        
                                        // If this was a new record (no original Id), remove the temporary id
                                        if (budgetRecord.id && budgetRecord.id !== salesforceId) {
                                            delete budgetRecord.id;
                                        }
                                    }
                                }
                            }
                        });
                        
                        // Update the partners array with the modified data
                        this.partners[partnerIndex] = {
                            ...this.partners[partnerIndex],
                            abatementExtra: {
                                ...this.partners[partnerIndex].abatementExtra,
                                personnelData: partner.abatementExtra.personnelData,
                                budgetData: partner.abatementExtra.budgetData
                            }
                        };
                    }
                } else {
                    throw new Error(`Failed to save strategy resources for partner ${partnerIndex}: ${result.error}`);
                }
            });
    }

    // Load existing Strategy_Resources__c data for a partner
    loadPartnerStrategyResources(partner, abatementId) {
        if (!abatementId) {
            return Promise.resolve();
        }
        
        return getStrategyResources({ abatementId: abatementId })
            .then(result => {
                if (result && result.success) {
                    // Update the partner's abatementExtraData with existing data
                    if (result.personnelData && Object.keys(result.personnelData).length > 0) {
                        partner.abatementExtra.personnelData = result.personnelData;
                    }
                    if (result.budgetData && Object.keys(result.budgetData).length > 0) {
                        partner.abatementExtra.budgetData = result.budgetData;
                    }
                }
            })
            .catch(error => {
                console.error('Error loading strategy resources:', error);
            });
    }

    // Load existing partners data from the database
    loadExistingPartnersData() {
        if (!this.recordId) {
            return Promise.resolve();
        }
        
        // This method would load existing partners from the database
        // For now, we'll leave it as a placeholder since the current implementation
        // doesn't seem to store partners in a way that can be easily loaded
        // The partners are built up as the user progresses through the form
        
        return Promise.resolve();
    }

    // Save organization data
    saveOrganizationData() {
        // Get the latest budget data from step 4 component
        const budgetComponent = this.template.querySelector('c-budget-information[data-step="4"]');
        if (budgetComponent && typeof budgetComponent.getData === 'function') {
            this.budgetInformationData = { ...budgetComponent.getData() };
        }
        
        // Merge organization data with budget data for the same Funding_Application__c record
        const combinedApplicationData = {
            ...this.organizationData,
            ...this.budgetInformationData,
            ...this.applicationData,
            Id: this.recordId // Include record ID if updating
        };
        
        if (Object.keys(combinedApplicationData).length === 0) {
            return Promise.resolve();
        }
        
        return saveApplication({ application: combinedApplicationData })
            .then(result => {
                this.recordId = result.Id; // Update recordId for subsequent saves
            })
            .catch(error => {
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

    get step2Data() { 
        return { ...this.applicationData, ...this.technicalProposalData }; 
    }

    get step3Data() { 
        // Only return clean abatement data
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
        console.log('step4Data getter called with applicationData:', this.applicationData, 'and budgetInformationData:', this.budgetInformationData);
        return { ...this.applicationData, ...this.budgetInformationData }; 
    }

    // Show loading state properly
    get showSpinner() { return this.isLoading && !this.hasError; }

    // Show content when data is loaded and no errors
    get showContent() { return this.isDataLoaded && !this.hasError; }

    get showSaveAndPreviewButton() { return this.currentStep === 4; }

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

    // Handle Add Partner
    handleAddPartner() {
        try {
            // Check if current partner data is already added
            if (this.isCurrentPartnerAdded) {
                // Navigate to step 2 and clear fields for new partner data
                this.currentStep = 2;
                this.updateStepStyles();
                this.resetPartnerData();
                this.showToast('Info', 'Form cleared for new partner data entry.', 'info');
                return;
            }

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
            }

            // Create partner data
            const selectedAbatementStrategies = this.abatementStrategiesData.abatementStrategies || [];
            const selectedCoreStrategies = this.abatementStrategiesData.coreStrategies || [];
            
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

            const partnerData = {
                partnerIndex: this.isEditingExistingPartner ? this.editingPartnerIndex : this.currentPartnerIndex,
                technicalProposal: { ...this.technicalProposalData },
                abatementStrategies: {
                    Id: this.abatementStrategiesData.Id || null, // Include the ID from abatement data
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
            
            const partnerName = this.technicalProposalData.PartnerName__c;
            
            if (this.isEditingExistingPartner) {
                // Update existing partner
                this.partners[this.editingPartnerIndex] = partnerData;
                console.log('Updated existing partner at index:', this.editingPartnerIndex);
                console.log('Updated partner data:', partnerData);
                console.log('Final partners array after update:', this.partners);
                this.showToast('Success', `Partner "${partnerName}" updated successfully`, 'success');
                this.isEditingExistingPartner = false;
                this.editingPartnerIndex = -1;
            } else {
                // Add new partner
                const existingPartnerIndex = this.partners.findIndex(partner => 
                    partner.technicalProposal.PartnerName__c === partnerName
                );
                
                if (existingPartnerIndex === -1) {
                    this.partners.push(partnerData);
                    this.currentPartnerIndex++;
                    console.log('Added new partner to partners array');
                    console.log('New partner data:', partnerData);
                    console.log('Final partners array after adding:', this.partners);
                    console.log('Total partners count:', this.partners.length);
                    console.log('Updated currentPartnerIndex:', this.currentPartnerIndex);
                    this.showToast('Success', `Partner "${partnerName}" added successfully`, 'success');
                    // Set flag to indicate current partner has been added
                    this.isCurrentPartnerAdded = true;
                } else {
                    this.showToast('Error', `Partner "${partnerName}" already exists. Please use a different partner name.`, 'error');
                    return;
                }
            }
            
            // Single log for final partners array state
            console.log('FINAL PARTNERS ARRAY:', JSON.stringify(this.partners));
            
            // Reset data for new partner
            this.resetPartnerData();
            
            // Navigate to Technical Proposal step (Step 2)
            this.currentStep = 2;
            this.updateStepStyles();
            
        } catch (error) {
            console.error('Error adding/updating partner:', error);
            this.showToast('Error', 'Failed to add/update partner', 'error');
        }
    }

    // Add current partner data if it exists (called when moving from step 3 to step 4)
    addCurrentPartnerIfExists() {
        try {
            // Check if current partner data is already added
            if (this.isCurrentPartnerAdded) {
                return; // Don't add again if already added
            }

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
                        Id: this.abatementStrategiesData.Id || null, // Include the ID from abatement data
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
                
                console.log('Adding current partner with data:', JSON.stringify(partnerData));
                
                // Check if this partner data already exists in the partners array
                const partnerName = this.technicalProposalData.PartnerName__c;
                const existingPartnerIndex = this.partners.findIndex(partner => 
                    partner.technicalProposal.PartnerName__c === partnerName
                );
                
                if (existingPartnerIndex === -1) {
                    // Partner doesn't exist, add it
                    this.partners.push(partnerData);
                    this.currentPartnerIndex++; // Increment the partner index
                    console.log('Auto-added partner to partners array');
                    console.log('Auto-added partner data:', partnerData);
                    console.log('Final partners array after auto-adding:', this.partners);
                    console.log('Total partners count after auto-adding:', this.partners.length);
                    console.log('Updated currentPartnerIndex:', this.currentPartnerIndex);
                    this.showToast('Success', `Partner ${this.partners.length} added automatically when moving to next step.`, 'success');
                    // Set flag to indicate current partner has been added
                    this.isCurrentPartnerAdded = true;
                } else {
                    // Partner already exists, update the existing partner data
                    this.partners[existingPartnerIndex] = partnerData;
                    console.log('Auto-updated existing partner at index:', existingPartnerIndex);
                    console.log('Auto-updated partner data:', partnerData);
                    console.log('Final partners array after auto-update:', this.partners);
                    this.showToast('Info', `Partner data updated when moving to next step.`, 'info');
                    // Set flag to indicate current partner has been added
                    this.isCurrentPartnerAdded = true;
                }
            }
            
            // Single log for final partners array state
            console.log('FINAL PARTNERS ARRAY:', JSON.stringify(this.partners));
            
        } catch (error) {
            console.error('Error adding current partner:', error);
            this.showToast('Error', 'Failed to add current partner data', 'error');
        }
    }

    // Reset partner-specific data
    resetPartnerData() {
        this.technicalProposalData = {};
        this.abatementStrategiesData = {};
        this.strategyLineResourcesData = {};
        this.abatementExtraData = {};

        // Reset editing flags
        this.isEditingExistingPartner = false;
        this.editingPartnerIndex = -1;
        
        // Reset the flag to indicate current partner data is not added yet
        this.isCurrentPartnerAdded = false;

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
        // Clear Technical Proposal form
        const techComponent = this.template.querySelector('c-technical-proposal[data-step="2"]');
        if (techComponent && typeof techComponent.clearData === 'function') {
            techComponent.clearData();
        }
        
        // Clear Abatement Strategies form with force refresh
        const abatementComponent = this.template.querySelector('c-abatement-strategies[data-step="3"]');
        
        if (abatementComponent) {
            // Call handleAddPartnerFromParent to log variables before clearing
            if (typeof abatementComponent.handleAddPartnerFromParent === 'function') {
                try {
                    abatementComponent.handleAddPartnerFromParent();
                } catch (error) {
                    console.error('Error calling handleAddPartnerFromParent:', error);
                }
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
                        Id: null, // Reset the ID when clearing
                        coreStrategies: [],
                        abatementStrategies: [],
                        CoreStrategies__c: '',
                        Core_Abatement_Strategies__c: '',
                        strategyLineResources: {},
                        personnelData: {},
                        budgetData: {}
                    };
                    
                    abatementComponent.setData(emptyAbatementData);
                    
                    // Also clear the strategyLineResourcesData property directly
                    if (abatementComponent.strategyLineResourcesData) {
                        abatementComponent.strategyLineResourcesData = {};
                    }
                }
            }, 100);
        }
    }

    // Get all partners data for saving
    getAllPartnersData() {
        // Check if there's current partner data that hasn't been added yet
        let allPartners = [...this.partners];
        
        // If we're in step 3 and there's current data, include it (but check for duplicates)
        if (this.currentStep === 3) {
            const currentPartnerData = this.getCurrentPartnerData();
            if (currentPartnerData) {
                // Check if this partner data already exists in the partners array
                const partnerName = currentPartnerData.technicalProposal.PartnerName__c;
                const existingPartnerIndex = allPartners.findIndex(partner => 
                    partner.technicalProposal.PartnerName__c === partnerName
                );
                
                if (existingPartnerIndex === -1) {
                    // Partner doesn't exist, add it
                    allPartners.push(currentPartnerData);
                } else {
                    // Partner already exists, update the existing partner data
                    allPartners[existingPartnerIndex] = currentPartnerData;
                }
            }
        }
        
        // Single log for final partners array state
        console.log('FINAL PARTNERS ARRAY:', JSON.stringify(allPartners));
        
        return {
            partners: allPartners,
            currentPartnerIndex: this.currentPartnerIndex,
            totalPartners: allPartners.length
        };
    }

    // Debug method to check current partners state
    @api
    debugPartnersState() {
        console.log('=== DEBUG PARTNERS STATE ===');
        console.log('Current partners array:', JSON.stringify(this.partners));
        console.log('Current partner index:', this.currentPartnerIndex);
        console.log('Is current partner added:', this.isCurrentPartnerAdded);
        console.log('Current step:', this.currentStep);
        console.log('Abatement strategies data:', JSON.stringify(this.abatementStrategiesData));
        console.log('=== END DEBUG ===');
    }

    // Get current partner data if it exists
    getCurrentPartnerData() {
        try {
            // Check if current partner data is already added
            if (this.isCurrentPartnerAdded) {
                return null; // Don't return current data if already added
            }

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
                        Id: abatementData.Id || null, // Include the ID from abatement data
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

    // Handle Save and Preview
    handleSaveAndPreview() {
        try {
            if (!this.validateAllSteps()) {
                return;
            }
            
            // If we're in step 3, add current partner data before saving
            // Only add if not already added
            if (this.currentStep === 3 && !this.isCurrentPartnerAdded) {
                this.addCurrentPartnerIfExists();
            }
            
            this.saveCurrentStepData();
            this.preparePreviewData();
            this.showPreviewModal = true;
        } catch (error) {
            this.showToast('Error', 'Failed to prepare preview', 'error');
        }
    }

    // Prepare data for preview modal
    preparePreviewData() {
        // Get the latest organization data
        const orgComponent = this.template.querySelector('c-organization-information[data-step="1"]');
        if (orgComponent && typeof orgComponent.getData === 'function') {
            this.organizationData = { ...orgComponent.getData() };
        }

        // Get the latest budget data
        const budgetComponent = this.template.querySelector('c-budget-information[data-step="4"]');
        if (budgetComponent && typeof budgetComponent.getData === 'function') {
            this.budgetInformationData = { ...budgetComponent.getData() };
        }

        // Combine all organization data for preview
        this.previewData = {
            organizationInfo: {
                ...this.organizationData,
                ...this.budgetInformationData
            },
            partners: this.getAllPartnersData()
        };
    }

    // Close preview modal
    handleCloseModal() {
        this.showPreviewModal = false;
    }

    // Budget Information handlers
    handleConsentChange(event) {
        this.consentChecked = event.target.checked;
    }

    handleEditBudget() {
        // Navigate to step 4 (Budget Information step)
        this.currentStep = 1;
        this.updateStepStyles();
        this.showPreviewModal = false;
        this.notifyChildComponents();
    }

    handleSubmitBudget() {
        if (!this.consentChecked) {
            this.showToast('Error', 'Please check the consent checkbox before submitting.', 'error');
            return;
        }
        
        try {
            // Validate all steps before saving
            if (!this.validateAllSteps()) {
                this.showToast('Error', 'Please complete all required fields before submitting.', 'error');
                return;
            }
            
            // Set ApplicationStatus__c to Submitted
            this.applicationData.ApplicationStatus__c = 'Submitted';
            
            // If we're in step 3, add current partner data before saving
            // Only add if not already added
            if (this.currentStep === 3 && !this.isCurrentPartnerAdded) {
                this.addCurrentPartnerIfExists();
            }
            
            // Save current step data
            this.saveCurrentStepData();
            
            // Use the existing save functionality to save application to Salesforce
            this.saveAllApplicationData();
            
            // Close the preview modal after successful save
            this.showPreviewModal = false;
            
        } catch (error) {
            console.error('Error in handleSubmitBudget:', error);
            this.showToast('Error', 'Failed to save application to Salesforce', 'error');
        }
    }

    // Computed property to determine if submit button should be disabled
    get isSubmitDisabled() {
        return !this.consentChecked;
    }

    // Get display value for picklist fields
    getPicklistDisplayValue(fieldName, value) {
        if (!value || !this.picklistValues[fieldName]) return value || 'Not Specified';
        
        const option = this.picklistValues[fieldName].find(opt => opt.value === value);
        return option ? option.label : value;
    }

    // Getter for strategy line resources list for modal display
    get strategyLineResourcesList() {
        if (!this.selectedPartnerData || !this.selectedPartnerData.strategyLineResources) {
            return [];
        }
        
        return Object.keys(this.selectedPartnerData.strategyLineResources).map(strategyKey => ({
            key: strategyKey,
            strategyName: strategyKey,
            data: this.selectedPartnerData.strategyLineResources[strategyKey]
        }));
    }

    // Getter for personnel data list for modal display
    get personnelDataList() {
        if (!this.selectedPartnerData || !this.selectedPartnerData.abatementExtra || !this.selectedPartnerData.abatementExtra.personnelData) {
            return [];
        }
        
        return Object.keys(this.selectedPartnerData.abatementExtra.personnelData).map(strategyKey => ({
            key: strategyKey,
            strategyName: strategyKey,
            data: this.selectedPartnerData.abatementExtra.personnelData[strategyKey]
        }));
    }

    // Getter for formatted personnel data list for modal display
    get formattedPersonnelDataList() {
        if (!this.selectedPartnerData || !this.selectedPartnerData.abatementExtra || !this.selectedPartnerData.abatementExtra.personnelData) {
            return [];
        }
        
        return Object.keys(this.selectedPartnerData.abatementExtra.personnelData).map(strategyKey => {
            const personnelArray = this.selectedPartnerData.abatementExtra.personnelData[strategyKey];
            return {
                key: strategyKey,
                strategyName: strategyKey,
                data: personnelArray.map(person => ({
                    ...person,
                    formattedName: person.Name__c || 'Not Specified',
                    formattedTitle: person.Title__c || 'Not Specified',
                    formattedEmail: person.Email__c || 'Not Specified',
                    formattedPhone: person.Phone__c || 'Not Specified',
                    formattedRole: person.Role__c || 'Not Specified',
                    formattedFTE: person.FTE__c || 'Not Specified'
                }))
            };
        });
    }

    // Getter for budget data list for modal display
    get budgetDataList() {
        if (!this.selectedPartnerData || !this.selectedPartnerData.abatementExtra || !this.selectedPartnerData.abatementExtra.budgetData) {
            return [];
        }
        
        return Object.keys(this.selectedPartnerData.abatementExtra.budgetData).map(strategyKey => ({
            key: strategyKey,
            strategyName: strategyKey,
            data: this.selectedPartnerData.abatementExtra.budgetData[strategyKey]
        }));
    }

    // Getter for formatted budget data list for modal display
    get formattedBudgetDataList() {
        if (!this.selectedPartnerData || !this.selectedPartnerData.abatementExtra || !this.selectedPartnerData.abatementExtra.budgetData) {
            return [];
        }
        
        return Object.keys(this.selectedPartnerData.abatementExtra.budgetData).map(strategyKey => {
            const budgetArray = this.selectedPartnerData.abatementExtra.budgetData[strategyKey];
            return {
                key: strategyKey,
                strategyName: strategyKey,
                data: budgetArray.map(budgetItem => ({
                    ...budgetItem,
                    formattedDescription: budgetItem.Description__c || 'Not Specified',
                    formattedAmount: budgetItem.Amount__c ? `$${parseFloat(budgetItem.Amount__c).toLocaleString()}` : 'Not Specified',
                    formattedCategory: budgetItem.Category__c || 'Not Specified',
                    formattedVendor: budgetItem.Vendor__c || 'Not Specified',
                    formattedJustification: budgetItem.Justification__c || 'Not Specified'
                }))
            };
        });
    }

    // Getter for formatted strategy line resources list for modal display
    get formattedStrategyLineResourcesList() {
        if (!this.selectedPartnerData || !this.selectedPartnerData.strategyLineResources) {
            return [];
        }
        
        return Object.keys(this.selectedPartnerData.strategyLineResources).map(strategyKey => {
            const data = this.selectedPartnerData.strategyLineResources[strategyKey];
            return {
                key: strategyKey,
                strategyName: strategyKey,
                data: data,
                formattedBudgetAmount: data.BudgetAmountForThePurchase__c ? `$${parseFloat(data.BudgetAmountForThePurchase__c).toLocaleString()}` : 'Not Specified',
                formattedInitialContinuation: data.IsYourStrategyInitialContinuation__c || 'Not Specified',
                formattedBudgetNarrative: data.BudgetNarrative__c || 'Not Specified',
                formattedImplementationPlan: data.ImplementationPlan__c || 'Not Specified'
            };
        });
    }

    // Format display values for the modal
    get formattedPreviewData() {
        if (!this.previewData.organizationInfo) return {};
        
        const data = this.previewData.organizationInfo;
        
        return {
            // Political Subdivision Information
            requestType: this.getPicklistDisplayValue('requestType', data.RequestType__c),
            nameOfPerson: data.NameOfPersonCompletingForm__c || 'Not Specified',
            titleOfPerson: data.TitleOfPersonCompletingForm__c || 'Not Specified',
            subdivisionName: data.Name || 'Not Specified',
            subdivisionContact: data.PoliticalSubdivisionContactNumber__c || 'Not Specified',
            subdivisionEmail: data.PoliticalSubdivisionEmail__c || 'Not Specified',
            sceisVendor: data.SCEISVendorNumber__c || 'Not Specified',
            entityType: this.getPicklistDisplayValue('entityType', data.EntityType__c),
            entityApprove: this.getPicklistDisplayValue('entityApprove', data.DoesEntityApproveLineItems__c),
            collaborating: this.getPicklistDisplayValue('collaborating', data.CollaboratingWithOtherGPSEntity__c),
            litigating: this.getPicklistDisplayValue('litigating', data.WasEntityALitigatingSubdivision__c),
            bellwether: this.getPicklistDisplayValue('bellwether', data.IsEntityAnSCBellwetherPlaintiff__c),
            conflict: this.getPicklistDisplayValue('conflict', data.Any_Potential_Conflict_with_SC_Recovery__c),
            
            // Payment Remit To Information
            paymentAddressLine1: data.PaymentRemitToAddressLine1__c || 'Not Specified',
            paymentAddressLine2: data.PaymentRemitToAddressLine2__c || '',
            paymentCity: data.PaymentRemitToCity__c || 'Not Specified',
            paymentState: this.getPicklistDisplayValue('paymentState', data.PaymentRemitToState__c),
            paymentZip: data.PaymentRemitToZip__c || 'Not Specified',
            
            // Political Subdivision Address
            subdivisionAddressLine1: data.AddressLine1__c || 'Not Specified',
            subdivisionAddressLine2: data.AddressLine2__c || '',
            subdivisionCity: data.City__c || 'Not Specified',
            subdivisionState: this.getPicklistDisplayValue('subdivisionState', data.State__c),
            subdivisionZip: data.Zip__c || 'Not Specified',
            
            // Application Point of Contact
            programManagerName: data.ProgramManagerName__c || 'Not Specified',
            programManagerEmail: data.ProgramManagerEmail__c || 'Not Specified',
            programManagerPhone: data.ProgramManagerPhoneNumber__c || 'Not Specified',
            fiscalManagerName: data.FiscalManagerTitle__c || 'Not Specified',
            fiscalManagerEmail: data.FiscalManagerEmail__c || 'Not Specified',
            fiscalManagerPhone: data.FiscalManagerPhoneNumber__c || 'Not Specified',
            
            // Budget Information
            totalProjectBudget: data.Total_Project_Budget__c ? `$${parseFloat(data.Total_Project_Budget__c).toLocaleString()}` : 'Not Specified',
            minusEstimatedCarryForward: data.MinusEstimatedCarryForwardAmount__c ? `$${parseFloat(data.MinusEstimatedCarryForwardAmount__c).toLocaleString()}` : 'Not Specified',
            minusEstimatedInterestEarned: data.MinusEstimatedInterestEarned__c ? `$${parseFloat(data.MinusEstimatedInterestEarned__c).toLocaleString()}` : 'Not Specified',
            totalAmountRequested: data.Total_Amount_Requested__c ? `$${parseFloat(data.Total_Amount_Requested__c).toLocaleString()}` : 'Not Specified'
        };
    }

    //Save avd Next Button
    get showSaveAndExitButton() { 
    // Show on steps 1 and 3 as requested, but can be changed to show on all steps: return true;
    return this.currentStep === 1 || this.currentStep === 3; 
    }

    handleSaveAndExit() {
    try {
        this.isLoading = true;
        
        // Set ApplicationStatus__c to Draft
        this.applicationData.ApplicationStatus__c = 'Draft';
        
        // Save current step data without validation
        this.saveCurrentStepData();
        
        // Always save all available data regardless of current step
        this.saveAndExitAllData();
    } catch (error) {
        this.showToast('Error', 'Failed to save and exit', 'error');
        this.isLoading = false;
    }
}

// Save and exit - saves all form data from all steps
saveAndExitAllData() {
    // Get the latest data from all components regardless of current step
    this.collectAllFormData();

    // Save organization data first (includes step 1 and step 4 data)
    const applicationData = {
        ...this.organizationData,
        ...this.budgetInformationData,
        ...this.applicationData,
        Id: this.recordId
    };

    let savePromise;
    
    // Save application data if there's any meaningful data
    if (this.hasApplicationData(applicationData)) {
        savePromise = saveApplication({ application: applicationData })
            .then(result => {
                this.recordId = result.Id;
                console.log('Application data saved with ID:', this.recordId);
                return Promise.resolve();
            });
    } else {
        savePromise = Promise.resolve();
    }

    savePromise
        .then(() => {
            // Check if there's current partner data to save (from steps 2 and 3)
            if (!this.isCurrentPartnerAdded && this.hasPartnerData()) {
                this.addCurrentPartnerIfExists();
            }
            
            // Save all partners data
            return this.saveAllPartnersDataForExit();
        })
        .then(() => {
            this.showToast('Success', 'All form data saved successfully. You can continue later.', 'success');
            this.isLoading = false;
            
            // Optional: Redirect or close the form
            // this.dispatchEvent(new CustomEvent('exit'));
        })
        .catch(error => {
            console.error('Error in saveAndExitAllData:', error);
            this.showToast('Error', 'Failed to save data: ' + (error.body?.message || error.message), 'error');
            this.isLoading = false;
        });
}

// Delete cleared records from Salesforce


// Collect all form data from all available components
collectAllFormData() {
    // Get organization data (Step 1)
    const orgComponent = this.template.querySelector('c-organization-information[data-step="1"]');
    if (orgComponent && typeof orgComponent.getData === 'function') {
        try {
            this.organizationData = { ...orgComponent.getData() };
            console.log('Collected organization data:', this.organizationData);
        } catch (error) {
            console.warn('Could not collect organization data:', error);
        }
    }

    // Get technical proposal data (Step 2)
    const techComponent = this.template.querySelector('c-technical-proposal[data-step="2"]');
    if (techComponent && typeof techComponent.getData === 'function') {
        try {
            this.technicalProposalData = { ...techComponent.getData() };
            console.log('Collected technical proposal data:', this.technicalProposalData);
        } catch (error) {
            console.warn('Could not collect technical proposal data:', error);
        }
    }

    // Get abatement strategies data (Step 3)
    const abatementComponent = this.template.querySelector('c-abatement-strategies[data-step="3"]');
    if (abatementComponent && typeof abatementComponent.getData === 'function') {
        try {
            const abatementData = abatementComponent.getData();
            this.abatementStrategiesData = { ...abatementData };
            console.log('Collected abatement strategies data:', this.abatementStrategiesData);
        } catch (error) {
            console.warn('Could not collect abatement strategies data:', error);
        }
    }

    // Get budget information data (Step 4)
    const budgetComponent = this.template.querySelector('c-budget-information[data-step="4"]');
    if (budgetComponent && typeof budgetComponent.getData === 'function') {
        try {
            this.budgetInformationData = { ...budgetComponent.getData() };
            console.log('Collected budget information data:', this.budgetInformationData);
        } catch (error) {
            console.warn('Could not collect budget information data:', error);
        }
    }
}

// Check if there's meaningful application data to save
hasApplicationData(applicationData) {
    if (!applicationData) return false;
    
    // Count meaningful fields (exclude Id and empty values)
    const meaningfulFields = Object.keys(applicationData).filter(key => 
        key !== 'Id' && 
        applicationData[key] !== null && 
        applicationData[key] !== undefined && 
        applicationData[key] !== ''
    );
    
    return meaningfulFields.length > 0;
}

// Check if there's meaningful partner data to save
hasPartnerData() {
    const hasTechnicalData = this.technicalProposalData && 
        Object.keys(this.technicalProposalData).some(key => 
            this.technicalProposalData[key] !== null && 
            this.technicalProposalData[key] !== undefined && 
            this.technicalProposalData[key] !== ''
        );
        
    const hasAbatementData = this.abatementStrategiesData && 
        (this.abatementStrategiesData.abatementStrategies?.length > 0 || 
         this.abatementStrategiesData.coreStrategies?.length > 0 ||
         Object.keys(this.abatementStrategiesData).some(key => 
            key !== 'abatementStrategies' && 
            key !== 'coreStrategies' &&
            this.abatementStrategiesData[key] !== null && 
            this.abatementStrategiesData[key] !== undefined && 
            this.abatementStrategiesData[key] !== ''
         ));
        
    return hasTechnicalData || hasAbatementData;
}

// Save all partners data for exit (similar to saveAllPartnersData but with different error handling)
saveAllPartnersDataForExit() {
    if (!this.partners || this.partners.length === 0) {
        return Promise.resolve();
    }

    console.log('Saving partners data for exit - Partners array:', JSON.stringify(this.partners));

    // Process partners sequentially
    let promise = Promise.resolve();
    
    this.partners.forEach((partner, index) => {
        promise = promise.then(() => {
            return this.savePartnerDataForExit(partner, index);
        });
    });
    
    return promise.then(() => {
        console.log('All partners saved for exit - Partners array:', JSON.stringify(this.partners));
    });
}

// Save individual partner data for exit (similar to savePartnerData but with different error handling)
savePartnerDataForExit(partner, partnerIndex) {
    // Prepare Abatement_Strategies__c data
    const abatementData = {
        Funding_Application__c: this.recordId,
        ...partner.technicalProposal,
        CoreStrategies__c: partner.abatementStrategies.CoreStrategies__c,
        Core_Abatement_Strategies__c: partner.abatementStrategies.Core_Abatement_Strategies__c
    };
    
    // Include the ID if it exists (for updates)
    if (partner.abatementStrategies.Id) {
        abatementData.Id = partner.abatementStrategies.Id;
    }
    
    return saveAbatementStrategies({ abatement: JSON.stringify(abatementData) })
        .then(result => {
            if (result && result.success && result.record && result.record.Id) {
                const abatementId = result.record.Id;
                
                // Update the partner's abatement strategy ID in the partners array
                const partnerToUpdate = this.partners.find(p => p.partnerIndex === partner.partnerIndex);
                if (partnerToUpdate) {
                    console.log(`Updating partner ${partner.partnerIndex} with abatement ID: ${abatementId}`);
                    partnerToUpdate.abatementStrategies.Id = abatementId;
                    // Force reactivity by creating a new array
                    this.partners = [...this.partners];
                }
                
                // Save Strategy Line Items (optional for exit, but good to have)
                const lineItemsPromise = this.savePartnerStrategyLineItemsForExit(partner, abatementId, partnerIndex);
                
                // Save Strategy Resources (optional for exit, but good to have)
                const resourcesPromise = this.savePartnerStrategyResourcesForExit(partner, abatementId, partnerIndex);
                
                return Promise.all([lineItemsPromise, resourcesPromise]);
            } else {
                console.warn(`Failed to save abatement strategy for partner ${partnerIndex} during exit`);
                return Promise.resolve(); // Don't fail the entire save process
            }
        })
        .catch(error => {
            console.warn(`Error saving partner ${partnerIndex} during exit:`, error);
            return Promise.resolve(); // Don't fail the entire save process
        });
}

// Save strategy line items for exit (non-blocking)
savePartnerStrategyLineItemsForExit(partner, abatementId, partnerIndex) {
    if (!partner.strategyLineResources || Object.keys(partner.strategyLineResources).length === 0) {
        return Promise.resolve();
    }

    const transformedLineItems = {};
    Object.keys(partner.strategyLineResources).forEach(key => {
        const item = { ...partner.strategyLineResources[key] };
        transformedLineItems[key] = item;
    });
    
    return saveStrategyLineItems({
        abatementId: abatementId,
        lineItemsJson: JSON.stringify(transformedLineItems)
    })
    .then(result => {
        if (result && result.success && result.strategyToIdMap) {
            Object.keys(result.strategyToIdMap).forEach(strategyValue => {
                const recordId = result.strategyToIdMap[strategyValue];
                if (partner.strategyLineResources[strategyValue]) {
                    partner.strategyLineResources[strategyValue].Id = recordId;
                }
            });
            this.partners = [...this.partners];
        }
    })
    .catch(error => {
        console.warn(`Error saving strategy line items for partner ${partnerIndex} during exit:`, error);
    });
}

// Save strategy resources for exit (non-blocking)
savePartnerStrategyResourcesForExit(partner, abatementId, partnerIndex) {
    if (!partner.abatementExtra || 
        (!partner.abatementExtra.personnelData || Object.keys(partner.abatementExtra.personnelData).length === 0) &&
        (!partner.abatementExtra.budgetData || Object.keys(partner.abatementExtra.budgetData).length === 0)) {
        return Promise.resolve();
    }

    const resourcesToSave = [];
    const resourceIndexMap = [];
    
    // Personnel Data
    if (partner.abatementExtra.personnelData) {
        Object.keys(partner.abatementExtra.personnelData).forEach(strategyName => {
            partner.abatementExtra.personnelData[strategyName].forEach((personnelRow, index) => {
                const resourceData = {
                    RecordTypeName: 'Personnel Information',
                    Strategy_Name__c: strategyName,
                    Abatement_Strategies__c: abatementId,
                    ...personnelRow
                };
                resourcesToSave.push(resourceData);
                resourceIndexMap.push({
                    type: 'personnel',
                    strategyName: strategyName,
                    index: index,
                    originalId: personnelRow.id || null
                });
            });
        });
    }
    
    // Budget Data
    if (partner.abatementExtra.budgetData) {
        Object.keys(partner.abatementExtra.budgetData).forEach(strategyName => {
            partner.abatementExtra.budgetData[strategyName].forEach((budgetRow, index) => {
                const resourceData = {
                    RecordTypeName: 'Budget Information',
                    Strategy_Name__c: strategyName,
                    Abatement_Strategies__c: abatementId,
                    ...budgetRow
                };
                resourcesToSave.push(resourceData);
                resourceIndexMap.push({
                    type: 'budget',
                    strategyName: strategyName,
                    index: index,
                    originalId: budgetRow.id || null
                });
            });
        });
    }

    if (resourcesToSave.length === 0) {
        return Promise.resolve();
    }
    
    return saveStrategyResources({ resourcesJson: JSON.stringify(resourcesToSave) })
        .then(result => {
            if (result && result.success && result.insertedIds) {
                // Update the partner's data with returned IDs
                resourceIndexMap.forEach((resourceInfo, saveIndex) => {
                    if (saveIndex < result.insertedIds.length) {
                        const salesforceId = result.insertedIds[saveIndex];
                        
                        if (resourceInfo.type === 'personnel' && 
                            partner.abatementExtra.personnelData[resourceInfo.strategyName]) {
                            const personnelRecord = partner.abatementExtra.personnelData[resourceInfo.strategyName][resourceInfo.index];
                            personnelRecord.Id = salesforceId;
                            if (personnelRecord.id && personnelRecord.id !== salesforceId) {
                                delete personnelRecord.id;
                            }
                        } else if (resourceInfo.type === 'budget' && 
                                   partner.abatementExtra.budgetData[resourceInfo.strategyName]) {
                            const budgetRecord = partner.abatementExtra.budgetData[resourceInfo.strategyName][resourceInfo.index];
                            budgetRecord.Id = salesforceId;
                            if (budgetRecord.id && budgetRecord.id !== salesforceId) {
                                delete budgetRecord.id;
                            }
                        }
                    }
                });
                
                // Update the partners array
                this.partners[partnerIndex] = {
                    ...this.partners[partnerIndex],
                    abatementExtra: {
                        ...this.partners[partnerIndex].abatementExtra,
                        personnelData: partner.abatementExtra.personnelData,
                        budgetData: partner.abatementExtra.budgetData
                    }
                };
            }
        })
        .catch(error => {
            console.warn(`Error saving strategy resources for partner ${partnerIndex} during exit:`, error);
        });
}

}