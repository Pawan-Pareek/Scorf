import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAbatementPicklistValues from '@salesforce/apex/GPSApplicationController.getAbatementPicklistValues';
//import saveAbatementStrategies from '@salesforce/apex/GPSApplicationController.saveAbatementStrategies';
import getAbatementStrategiesRecord from '@salesforce/apex/GPSApplicationController.getAbatementStrategiesRecord';
import getStrategyLineItems from '@salesforce/apex/GPSApplicationController.getStrategyLineItems';

export default class AbatementStrategies extends LightningElement {
    @api applicationData = {};
    @api picklistValues = {};
    @api recordId;
    // Removed: @api strategyLineResourcesData;
    @api 
    get strategyLineResourcesData() {
        return this._strategyLineResourcesData || {};
    }
    
    set strategyLineResourcesData(value) {
        this._strategyLineResourcesData = value;
        // Process the data to ensure Id field exists
        if (value && Object.keys(value).length > 0) {
            const processedData = {};
            Object.keys(value).forEach(key => {
                const resourceData = value[key];
                processedData[key] = {
                    Id: resourceData.Id || null, // Ensure Id field exists
                    BudgetAmountForThePurchase__c: resourceData.BudgetAmountForThePurchase__c || '',
                    IsYourStrategyInitialContinuation__c: resourceData.IsYourStrategyInitialContinuation__c || '',
                    BudgetNarrative__c: resourceData.BudgetNarrative__c || '',
                    ImplementationPlanForTheStrategy__c: resourceData.ImplementationPlanForTheStrategy__c || '',
                    ProvideTheOutcomeMeasures__c: resourceData.ProvideTheOutcomeMeasures__c || '',
                    ProvideTheProcessMeasures__c: resourceData.ProvideTheProcessMeasures__c || '',
                    Strategy_Value__c: resourceData.Strategy_Value__c || key
                };
            });
            this._strategyLineResourcesData = processedData;
        }
    }

    @track coreStrategies = [];
    @track mappedAbatementStrategies = {};
    @track selectedCoreStrategies = [];
    @track selectedAbatementStrategies = [];
    @track expandedStrategies = new Set();
    @track isLoading = false;
    @track hasError = false;
    @track errorMessage = '';

    // Track component data
    @track componentData = {
        coreStrategies: [],
        abatementStrategies: []
    };

    @track existingRecordId = null;

    @track abatementOptionDataMap = {};

    @track personnelData = {}; // { abatementValue: [personnelRows] }
    @track budgetData = {};

    @track personnelRows = [
        { id: Date.now(), PersonnelName__c: '', PersonnelPosition__c: '', PersonnelKeyStaffAnnualSalary__c: '', PersonnelLevelOfEffort__c: '', PersonnelTotalChargedToAward__c: '' }
    ];

    // @api
    // handleAddPartnerFromParent() {
    //     // Handle Add Partner action from parent
    //     this.handleAddPartner();
    // }

    connectedCallback() {
        this.loadPicklistData();
        if (this.recordId) {
            this.loadExistingData();
        }
        // Listen for addpartner event from parent as fallback
        // this.template?.addEventListener?.('addpartner', this.handleAddPartner.bind(this));
        this.template?.addEventListener?.('addpartner', this.handleAddPartnerFromParent.bind(this));
    }

    // handleAddPartner() {
    //     // Clear only the local fields
    //     this.selectedCoreStrategies = [];
    //     this.selectedAbatementStrategies = [];
    //     this.personnelData = {};
    //     this.budgetData = {};
    //     this.expandedStrategies = new Set();
    //     this.updateComponentData && this.updateComponentData();
    //     // Optionally show a toast
    //     this.showToast('Info', 'Add Partner button clicked', 'info');
    //     // Optionally, dispatch a custom event for further handling
    //     this.dispatchEvent(new CustomEvent('partneradded'));
    //     console.log('handleAddPartner START in Abatement Strategies');
    // }


    
    @wire(getAbatementPicklistValues)
    wiredPicklistData({ error, data }) {
        if (data && data.success) {
            this.coreStrategies = data.coreStrategies;
            this.mappedAbatementStrategies = data.mappedAbatementStrategies;
            this.hasError = false;
        } else if (error || (data && !data.success)) {
            console.error('Error loading picklist data:', error || data.error);
            this.hasError = true;
            this.errorMessage = error?.body?.message || data?.error || 'Failed to load form data';
            this.showToast('Error', this.errorMessage, 'error');
        }
    }

    loadPicklistData() {
        this.isLoading = true;
        getAbatementPicklistValues()
            .then(result => {
                if (result.success) {
                    this.coreStrategies = result.coreStrategies;
                    this.mappedAbatementStrategies = result.mappedAbatementStrategies;
                } else {
                    this.handleError('Failed to load picklist data', result.error);
                }
                this.isLoading = false;
            })
            .catch(error => {
                console.error('Error loading picklist data:', error);
                this.handleError('Failed to load form data', error);
                this.isLoading = false;
            });
    }

    loadExistingData() {
        if (!this.recordId) return;
        
        getAbatementStrategiesRecord({ recordId: this.recordId })
            .then(result => {
                if (result.success && result.record) {
                    const record = result.record;
                    this.selectedCoreStrategies = record.CoreStrategies__c || [];
                    this.selectedAbatementStrategies = record.Core_Abatement_Strategies__c || [];
                    
                    // Store the record ID for existing records
                    this.existingRecordId = record.Id;
                    
                    // Expand strategies that have selections
                    this.selectedCoreStrategies.forEach(strategy => {
                        // Extract letter from strategy value (e.g., "A: Something" -> "A")
                        const letter = this.extractStrategyLetter(strategy);
                        this.expandedStrategies.add(letter);
                    });
                    
                    // Load strategy line items data
                    this.loadStrategyLineItemsData(record.Id);
                    
                    this.updateComponentData();
                }
            })
            .catch(error => {
                console.error('Error loading existing data:', error);
            });
    }

    loadStrategyLineItemsData(abatementId) {
        if (!abatementId) return;
        
        getStrategyLineItems({ abatementId: abatementId })
            .then(result => {
                if (result.success && result.strategyLineItems) {
                    // Process the data to ensure Id field exists
                    const processedData = {};
                    Object.keys(result.strategyLineItems).forEach(key => {
                        const resourceData = result.strategyLineItems[key];
                        processedData[key] = {
                            Id: resourceData.Id || null, // Ensure Id field exists
                            BudgetAmountForThePurchase__c: resourceData.BudgetAmountForThePurchase__c || '',
                            IsYourStrategyInitialContinuation__c: resourceData.IsYourStrategyInitialContinuation__c || '',
                            BudgetNarrative__c: resourceData.BudgetNarrative__c || '',
                            ImplementationPlanForTheStrategy__c: resourceData.ImplementationPlanForTheStrategy__c || '',
                            ProvideTheOutcomeMeasures__c: resourceData.ProvideTheOutcomeMeasures__c || '',
                            ProvideTheProcessMeasures__c: resourceData.ProvideTheProcessMeasures__c || '',
                            Strategy_Value__c: resourceData.Strategy_Value__c || key
                        };
                    });
                    this._strategyLineResourcesData = processedData;
                    console.log('Loaded strategy line items data:', this._strategyLineResourcesData);
                }
            })
            .catch(error => {
                console.error('Error loading strategy line items data:', error);
            });
    }

    // Personnel Methods
    handlePersonnelInputChange(event) {
        const abatementValue = event.target.dataset.abatement;
        const idx = parseInt(event.target.dataset.index, 10);
        const field = event.target.dataset.field;
        const value = event.target.value;
        
        if (!abatementValue || idx === undefined || !field) {
            console.error('Missing required data attributes');
            return;
        }
    
        // Initialize personnel data if it doesn't exist
        if (!this.personnelData[abatementValue]) {
            this.personnelData[abatementValue] = [];
        }
    
        // Ensure the personnel record exists at the index
        if (!this.personnelData[abatementValue][idx]) {
            this.personnelData[abatementValue][idx] = this.createEmptyPersonnelRecord();
        }
    
        // Update the specific field
        this.personnelData[abatementValue][idx][field] = value;
        
        // Force reactivity by creating a new object
        this.personnelData = { ...this.personnelData };
        
        // Emit change event
        this.emitAbatementDataChange();
    }

handleBudgetInputChange(event) {
    const abatementValue = event.target.dataset.abatement;
    const field = event.target.dataset.field || event.target.name;
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    const index = parseInt(event.target.dataset.index, 10);

    if (!abatementValue || index === undefined || index < 0) {
        console.error('Invalid budget input change parameters');
        return;
    }

    // Get current budget data for this abatement option
    const currentBudgetData = this.budgetData[abatementValue] || [];
    
    // Create a copy of the budget array
    const updatedBudgetData = [...currentBudgetData];
    
    // Ensure the record exists at the specified index
    if (!updatedBudgetData[index]) {
        updatedBudgetData[index] = this.createEmptyBudgetRecord();
    }
    
    // Update the specific field
    updatedBudgetData[index] = {
        ...updatedBudgetData[index],
        [field]: value
    };
    
    // Update the budget data
    this.budgetData = {
        ...this.budgetData,
        [abatementValue]: updatedBudgetData
    };
    
    this.emitAbatementDataChange();
}

addPersonnelRow(event) {
    const abatementValue = event.currentTarget.dataset.abatement;
    
    if (!abatementValue) {
        console.error('No abatement value found for personnel row addition');
        this.showToast('Error', 'Unable to add personnel row', 'error');
        return;
    }
    
    // Initialize personnel data if it doesn't exist
    if (!this.personnelData[abatementValue]) {
        this.personnelData[abatementValue] = [];
    }
    
    // Create new personnel record
    const newPersonnelRecord = this.createEmptyPersonnelRecord();
    
    // Add to the array
    this.personnelData[abatementValue] = [
        ...this.personnelData[abatementValue],
        newPersonnelRecord
    ];
    
    // Force reactivity
    this.personnelData = { ...this.personnelData };
    
    // Emit change event
    this.emitAbatementDataChange();
    
    // Show success message
    this.showToast('Success', 'Personnel row added successfully', 'success');
}


addBudgetRow(event) {
    const abatementValue = event.currentTarget.dataset.abatement;
    
    if (!abatementValue) {
        console.error('No abatement value found for budget row addition');
        return;
    }
    
    // Get current budget data for this abatement option
    const currentBudgetData = this.budgetData[abatementValue] || [];
    
    // Create new budget record with unique ID
    const newBudgetRecord = this.createEmptyBudgetRecord();
    
    // Add to the array
    const updatedBudgetData = [...currentBudgetData, newBudgetRecord];
    
    // Update the budget data
    this.budgetData = {
        ...this.budgetData,
        [abatementValue]: updatedBudgetData
    };
    
    this.emitAbatementDataChange();
}

deletePersonnelRow(event) {
    const abatementValue = event.currentTarget.dataset.abatement;
    const idx = parseInt(event.currentTarget.dataset.index, 10);
    
    if (!abatementValue || idx === undefined || idx < 0) {
        console.error('Invalid parameters for personnel row deletion');
        return;
    }
    
    if (!this.personnelData[abatementValue] || idx >= this.personnelData[abatementValue].length) {
        console.error('Personnel row not found');
        return;
    }
    
    // Remove the personnel record at the specified index
    const updatedPersonnelData = this.personnelData[abatementValue].filter((_, index) => index !== idx);
    
    // Update the personnel data
    if (updatedPersonnelData.length === 0) {
        // If no records left, remove the key entirely
        const newPersonnelData = { ...this.personnelData };
        delete newPersonnelData[abatementValue];
        this.personnelData = newPersonnelData;
    } else {
        this.personnelData = {
            ...this.personnelData,
            [abatementValue]: updatedPersonnelData
        };
    }
    
    // Emit change event
    this.emitAbatementDataChange();
    
    // Show success message
    this.showToast('Success', 'Personnel row deleted successfully', 'success');
}

deleteBudgetRow(event) {
    const abatementValue = event.currentTarget.dataset.abatement;
    const index = parseInt(event.currentTarget.dataset.index, 10);
    
    if (!abatementValue || index === undefined || index < 0) {
        console.error('Invalid parameters for budget row deletion');
        return;
    }
    
    // Get current budget data
    const currentBudgetData = this.budgetData[abatementValue] || [];
    
    if (index >= currentBudgetData.length) {
        console.error('Index out of bounds for budget deletion');
        return;
    }
    
    // Remove the record at the specified index
    const updatedBudgetData = currentBudgetData.filter((_, i) => i !== index);
    
    // Update the budget data
    if (updatedBudgetData.length === 0) {
        // If no records left, remove the key entirely
        const newBudgetData = { ...this.budgetData };
        delete newBudgetData[abatementValue];
        this.budgetData = newBudgetData;
    } else {
        this.budgetData = {
            ...this.budgetData,
            [abatementValue]: updatedBudgetData
        };
    }
    
    this.emitAbatementDataChange();
}


// Helper Methods
createEmptyPersonnelRecord() {
    return {
        id: this.generateUniqueId(),
        PersonnelName__c: '',
        PersonnelPosition__c: '',
        PersonnelKeyStaffAnnualSalary__c: '',
        PersonnelLevelOfEffort__c: '',
        PersonnelTotalChargedToAward__c: ''
    };
}
createEmptyBudgetRecord() {
    return {
        id: this.generateUniqueId(),
        BudgetItem__c: '',
        BudgetPurpose__c: '',
        BudgetCalculation__c: '',
        BudgetTotalChargedToAward__c: ''
    };
}
    // Helper method to extract letter from strategy value
    extractStrategyLetter(value) {
        if (!value) return '';
        const match = value.match(/^([A-Z])/);
        return match ? match[1] : '';
    }

    // Helper method to extract number from sub-strategy value
    extractSubStrategyNumber(value) {
        if (!value) return '';
        // Extract pattern like "A.1", "B.2", etc.
        const match = value.match(/^[A-Z]\.(\d+)/);
        return match ? match[1] : '';
    }

    // Replace your existing processedCoreStrategies getter with this updated version
// Updated processedCoreStrategies getter with better data handling
get processedCoreStrategies() {
    return this.coreStrategies.map((strategy, coreIdx) => {
        const strategyLetter = this.extractStrategyLetter(strategy.value);
        const isExpanded = this.expandedStrategies.has(strategyLetter);
        const abatementOptions = this.mappedAbatementStrategies[strategy.value] || [];
        const selectedCount = this.getSelectedAbatementCount(strategy.value);
        
        // Add selection state, extract numbers, and add persistedData for each abatement option
        const processedAbatementOptions = abatementOptions.map((option, abateIdx) => {
            const isSelected = this.selectedAbatementStrategies.includes(option.value);
            return {
                ...option,
                isSelected: isSelected,
                subNumber: this.extractSubStrategyNumber(option.value) || (abateIdx + 1),
                // Always include persisted data if it exists, regardless of selection
                persistedData: this._strategyLineResourcesData && this._strategyLineResourcesData[option.value]
                    ? { ...this._strategyLineResourcesData[option.value] }
                    : {},
                personnelRows: isSelected ? (this.personnelData[option.value] || []) : [],
                budgetRows: isSelected ? (this.budgetData[option.value] || []) : []
            };
        });
        
        return {
            ...strategy,
            strategyLetter: strategyLetter || String.fromCharCode(65 + coreIdx),
            isExpanded: isExpanded,
            abatementOptions: processedAbatementOptions,
            hasAbatementOptions: abatementOptions.length > 0,
            selectedAbatementCount: selectedCount,
            iconName: isExpanded ? 'utility:chevronup' : 'utility:chevrondown',
            hasSelections: selectedCount > 0 ? 'strategy-item has-selections slds-m-bottom_medium' : 'strategy-item slds-m-bottom_medium'
        };
    });
}


    getSelectedAbatementCount(coreStrategyValue) {
        const abatementOptions = this.mappedAbatementStrategies[coreStrategyValue] || [];
        return abatementOptions.filter(option => 
            this.selectedAbatementStrategies.includes(option.value)
        ).length;
    }

    handleCoreStrategyToggle(event) {
        const strategyValue = event.currentTarget.dataset.strategy;
        const strategyLetter = this.extractStrategyLetter(strategyValue);
        
        if (this.expandedStrategies.has(strategyLetter)) {
            this.expandedStrategies.delete(strategyLetter);
        } else {
            this.expandedStrategies.add(strategyLetter);
        }
        
        // Force reactivity
        this.expandedStrategies = new Set(this.expandedStrategies);
    }

    handleAbatementStrategyChange(event) {
        const strategyValue = event.currentTarget.dataset.strategy;
        const isChecked = event.target.checked;

        // Find the parent core strategy for this abatement option
        let parentCoreStrategy = null;
        for (const coreStrategy in this.mappedAbatementStrategies) {
            if (this.mappedAbatementStrategies[coreStrategy].some(opt => opt.value === strategyValue)) {
                parentCoreStrategy = coreStrategy;
                break;
            }
        }
        if (parentCoreStrategy) {
            const letter = this.extractStrategyLetter(parentCoreStrategy);
            this.expandedStrategies.add(letter);
            // Force reactivity
            this.expandedStrategies = new Set(this.expandedStrategies);
        }

        if (isChecked) {
            if (!this.selectedAbatementStrategies.includes(strategyValue)) {
                this.selectedAbatementStrategies.push(strategyValue);
            }
            // Ensure parent core strategy is selected
            if (parentCoreStrategy && !this.selectedCoreStrategies.includes(parentCoreStrategy)) {
                this.selectedCoreStrategies.push(parentCoreStrategy);
            }
        } else {
            this.selectedAbatementStrategies = this.selectedAbatementStrategies.filter(
                item => item !== strategyValue
            );
            // Do NOT clear data here. Data will only be cleared by handleClearAbatementOption.
            // If no sub-strategies remain selected for this core, remove it from selectedCoreStrategies
            const abatementOptions = this.mappedAbatementStrategies[parentCoreStrategy] || [];
            const anySelected = abatementOptions.some(opt => this.selectedAbatementStrategies.includes(opt.value));
            if (parentCoreStrategy && !anySelected) {
                this.selectedCoreStrategies = this.selectedCoreStrategies.filter(item => item !== parentCoreStrategy);
            }
        }

        this.updateComponentData();
        this.emitAbatementDataChange(); // Notify parent of all changes
    }

    handleClearStrategy(event) {
        const coreStrategyValue = event.currentTarget.dataset.strategy;
        const abatementOptions = this.mappedAbatementStrategies[coreStrategyValue] || [];
        const optionsToClear = abatementOptions.map(opt => opt.value);
    
        // Collect IDs to be cleared before removing data
        const strategyLineItemIdsToClear = [];
        const strategyResourcesIdsToClear = [];
        
        optionsToClear.forEach(optionValue => {
            // Check for strategy line item ID
            if (this._strategyLineResourcesData[optionValue] && this._strategyLineResourcesData[optionValue].Id) {
                strategyLineItemIdsToClear.push(this._strategyLineResourcesData[optionValue].Id);
            }
            
            // Check for personnel data IDs
            if (this.personnelData[optionValue]) {
                this.personnelData[optionValue].forEach(personnel => {
                    if (personnel.Id) {
                        strategyResourcesIdsToClear.push(personnel.Id);
                    }
                });
            }
            
            // Check for budget data IDs
            if (this.budgetData[optionValue]) {
                this.budgetData[optionValue].forEach(budget => {
                    if (budget.Id) {
                        strategyResourcesIdsToClear.push(budget.Id);
                    }
                });
            }
        });
        
        // Dispatch event to parent with IDs to be cleared
        if (strategyLineItemIdsToClear.length > 0 || strategyResourcesIdsToClear.length > 0) {
            this.dispatchEvent(new CustomEvent('strategyclear', {
                detail: {
                    strategyLineItemIds: strategyLineItemIdsToClear,
                    strategyResourcesIds: strategyResourcesIdsToClear,
                    clearedStrategies: optionsToClear
                }
            }));
        }
    
        // Remove all selected abatement strategies for this core strategy
        this.selectedAbatementStrategies = this.selectedAbatementStrategies.filter(
            item => !optionsToClear.includes(item)
        );
    
        // Remove all associated strategy line item data
        const updatedResources = { ...this._strategyLineResourcesData };
        optionsToClear.forEach(optionValue => {
            if (updatedResources[optionValue]) {
                delete updatedResources[optionValue];
            }
        });
        this._strategyLineResourcesData = updatedResources;
    
        // Clear personnel and budget data for all options
        const updatedPersonnelData = { ...this.personnelData };
        const updatedBudgetData = { ...this.budgetData };
    
        optionsToClear.forEach(optionValue => {
            if (updatedPersonnelData[optionValue]) {
                delete updatedPersonnelData[optionValue];
            }
            if (updatedBudgetData[optionValue]) {
                delete updatedBudgetData[optionValue];
            }
        });
    
        this.personnelData = updatedPersonnelData;
        this.budgetData = updatedBudgetData;
    
        // Debug logs to confirm cleared state
        console.log('After clear, strategyLineResourcesData:', JSON.stringify(this._strategyLineResourcesData, null, 2));
        console.log('After clear, personnelData:', this.personnelData);
        console.log('After clear, budgetData:', this.budgetData);
    
        // Deselect the parent core strategy since all its children are cleared
        this.selectedCoreStrategies = this.selectedCoreStrategies.filter(item => item !== coreStrategyValue);
        
        this.updateComponentData();
        this.emitAbatementDataChange();
        
        this.showToast('Success', 'All strategies cleared successfully', 'success');
    }
    

    handleClearAbatementOption(event) {
        const abatementValue = event.currentTarget.dataset.abatement;
        
        console.log('Clearing abatement option:', abatementValue);
        
        // Collect IDs to be cleared before removing data
        const strategyLineItemIdsToClear = [];
        const strategyResourcesIdsToClear = [];
        
        // Check for strategy line item ID
        if (this._strategyLineResourcesData[abatementValue] && this._strategyLineResourcesData[abatementValue].Id) {
            strategyLineItemIdsToClear.push(this._strategyLineResourcesData[abatementValue].Id);
        }
        
        // Check for personnel data IDs
        if (this.personnelData[abatementValue]) {
            this.personnelData[abatementValue].forEach(personnel => {
                if (personnel.Id) {
                    strategyResourcesIdsToClear.push(personnel.Id);
                }
            });
        }
        
        // Check for budget data IDs
        if (this.budgetData[abatementValue]) {
            this.budgetData[abatementValue].forEach(budget => {
                if (budget.Id) {
                    strategyResourcesIdsToClear.push(budget.Id);
                }
            });
        }
        
        // Dispatch event to parent with IDs to be cleared
        if (strategyLineItemIdsToClear.length > 0 || strategyResourcesIdsToClear.length > 0) {
            this.dispatchEvent(new CustomEvent('strategyclear', {
                detail: {
                    strategyLineItemIds: strategyLineItemIdsToClear,
                    strategyResourcesIds: strategyResourcesIdsToClear,
                    clearedStrategies: [abatementValue]
                }
            }));
        }
        
        // Filter out the deselected abatement strategy
        this.selectedAbatementStrategies = this.selectedAbatementStrategies.filter(
            item => item !== abatementValue
        );
    
        // Remove the corresponding data from strategyLineResourcesData safely
        if (this._strategyLineResourcesData && this._strategyLineResourcesData[abatementValue]) {
            const updatedData = { ...this._strategyLineResourcesData };
            delete updatedData[abatementValue];
            this._strategyLineResourcesData = updatedData;
        }
    
        // Clear personnel data
        if (this.personnelData[abatementValue]) {
            const updatedPersonnelData = { ...this.personnelData };
            delete updatedPersonnelData[abatementValue];
            this.personnelData = updatedPersonnelData;
        }
    
        // Clear budget data
        if (this.budgetData[abatementValue]) {
            const updatedBudgetData = { ...this.budgetData };
            delete updatedBudgetData[abatementValue];
            this.budgetData = updatedBudgetData;
        }
    
        // Check if this was the last selection for the parent and deselect parent if so
        let parentCoreStrategy = null;
        for (const coreStrategy in this.mappedAbatementStrategies) {
            if (this.mappedAbatementStrategies[coreStrategy].some(opt => opt.value === abatementValue)) {
                parentCoreStrategy = coreStrategy;
                break;
            }
        }
    
        if (parentCoreStrategy) {
            const abatementOptions = this.mappedAbatementStrategies[parentCoreStrategy] || [];
            const anySelected = abatementOptions.some(opt => this.selectedAbatementStrategies.includes(opt.value));
            if (!anySelected) {
                this.selectedCoreStrategies = this.selectedCoreStrategies.filter(item => item !== parentCoreStrategy);
            }
        }
    
        // Force template re-render by updating the processed data
        this.updateComponentData();
        this.emitAbatementDataChange();
        
        // Show success message
        this.showToast('Success', 'Strategy cleared successfully', 'success');
    }

    isAbatementStrategySelected(strategyValue) {
        return this.selectedAbatementStrategies.includes(strategyValue);
    }

    updateComponentData() {
        this.componentData = {
            Id: this.existingRecordId, // Include the ID (null if new record, actual ID if existing)
            coreStrategies: [...this.selectedCoreStrategies],
            abatementStrategies: [...this.selectedAbatementStrategies],
            CoreStrategies__c: this.selectedCoreStrategies.join(';'),
            Core_Abatement_Strategies__c: this.selectedAbatementStrategies.join(';')
        };
    }

    notifyParent() {
        const dataChangeEvent = new CustomEvent('datachange', {
            detail: {
                stepData: this.componentData,
                stepType: 'abatementStrategies'
            }
        });
        this.dispatchEvent(dataChangeEvent);
    }

    // Add this method to handle input changes for the inlined strategy line resources form
    handleStrategyLineResourceInputChange(event) {
        const abatementValue = event.target.dataset.abatement;
        const field = event.target.dataset.field || event.target.name;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

        // Get current data or initialize
        const currentData = this.strategyLineResourcesData[abatementValue] || {};
        const defaultData = {
            Id: currentData.Id || null, // Preserve existing Id or set to null
            BudgetAmountForThePurchase__c: currentData.BudgetAmountForThePurchase__c || '',
            IsYourStrategyInitialContinuation__c: currentData.IsYourStrategyInitialContinuation__c || '',
            BudgetNarrative__c: currentData.BudgetNarrative__c || '',
            ImplementationPlanForTheStrategy__c: currentData.ImplementationPlanForTheStrategy__c || '',
            ProvideTheOutcomeMeasures__c: currentData.ProvideTheOutcomeMeasures__c || '',
            ProvideTheProcessMeasures__c: currentData.ProvideTheProcessMeasures__c || '',
            Strategy_Value__c: currentData.Strategy_Value__c || abatementValue
        };

        // Update the field
        const updatedData = {
            ...defaultData,
            [field]: value
        };
        this._strategyLineResourcesData = {
            ...this._strategyLineResourcesData,
            [abatementValue]: updatedData
        };
        console.log('strategyLineResourcesData updated:', JSON.stringify(this._strategyLineResourcesData));
        this.emitAbatementDataChange();
    }

    // Getter for initial/continuation picklist options
    get initialContinuationOptions() {
        if (this.picklistValues && this.picklistValues.IsYourStrategyInitialContinuation__c) {
            return this.picklistValues.IsYourStrategyInitialContinuation__c.map(option => ({
                label: option.label,
                value: option.value
            }));
        }
        return [
            { label: 'Initial', value: 'Initial' },
            { label: 'Continuation', value: 'Continuation' }
        ];
    }

    // Emit a single datachange event upward with all abatement data
    emitAbatementDataChange() {
        // Send ALL data to parent, not just selected
        const abatementData = {
            ...this.componentData,
            strategyLineResources: { ...this._strategyLineResourcesData }
        };
        const personnelData = { ...this.personnelData };
        const budgetData = { ...this.budgetData };

        // Log the data being sent to the parent
        console.log('Emitting abatementData to parent:', JSON.stringify(abatementData));
        console.log('Emitting personnelData to parent:', JSON.stringify(personnelData));
        console.log('Emitting budgetData to parent:', JSON.stringify(budgetData));

        const dataChangeEvent = new CustomEvent('datachange', {
            detail: {
                abatementStrategies: abatementData,
                personnelData: personnelData,
                budgetData: budgetData,
                stepType: 'abatementStrategies'
            }
        });
        this.dispatchEvent(dataChangeEvent);
    }

    // Add this handler to re-dispatch the event
    // Remove the handleStrategyLineResourcesChange method, as it is not needed for event bubbling to the grandparent.

    // Public methods for parent component
    @api
    setData(data) {
        if (data) {
            // Restore the record ID if it exists
            if (data.Id) {
                this.existingRecordId = data.Id;
            }
            
            // Restore selected core and abatement strategies
            if (data.coreStrategies) {
                this.selectedCoreStrategies = Array.isArray(data.coreStrategies) ? data.coreStrategies : data.coreStrategies.split(';');
            }
            if (data.abatementStrategies) {
                this.selectedAbatementStrategies = Array.isArray(data.abatementStrategies) ? data.abatementStrategies : data.abatementStrategies.split(';');
            }
            if (data.strategyLineResources) {
                // Ensure each strategy line resource has an Id field
                const processedStrategyLineResources = {};
                Object.keys(data.strategyLineResources).forEach(key => {
                    const resourceData = data.strategyLineResources[key];
                    processedStrategyLineResources[key] = {
                        Id: resourceData.Id || null, // Ensure Id field exists
                        BudgetAmountForThePurchase__c: resourceData.BudgetAmountForThePurchase__c || '',
                        IsYourStrategyInitialContinuation__c: resourceData.IsYourStrategyInitialContinuation__c || '',
                        BudgetNarrative__c: resourceData.BudgetNarrative__c || '',
                        ImplementationPlanForTheStrategy__c: resourceData.ImplementationPlanForTheStrategy__c || '',
                        ProvideTheOutcomeMeasures__c: resourceData.ProvideTheOutcomeMeasures__c || '',
                        ProvideTheProcessMeasures__c: resourceData.ProvideTheProcessMeasures__c || '',
                        Strategy_Value__c: resourceData.Strategy_Value__c || key
                    };
                });
                this._strategyLineResourcesData = processedStrategyLineResources;
            }
            if (data.personnelData) {
                this.personnelData = { ...data.personnelData };
            }
            if (data.budgetData) {
                this.budgetData = { ...data.budgetData };
            }
            this.updateComponentData();
            // Do NOT expand anything here!
            // this.expandedStrategies = new Set(); // <-- Removed to preserve expanded state
        }
    }

    @api
    getData() {
        return this.componentData;
    }

    @api
    validateStep() {
        // Add validation logic if needed
        return true;
    }

    /**
     * Call this method after saving data to ensure the selected core strategy accordions are open.
     */
    @api
    handleAfterSave() {
        // Clear and update expandedStrategies to open all selected core strategies
        this.expandedStrategies.clear();
        this.selectedCoreStrategies.forEach(strategy => {
            const letter = this.extractStrategyLetter(strategy);
            this.expandedStrategies.add(letter);
        });
        // Force reactivity
        this.expandedStrategies = new Set(this.expandedStrategies);
    }

    handleError(message, error) {
        console.error(message, error);
        this.hasError = true;
        this.errorMessage = message;
        this.showToast('Error', message, 'error');
    }

    showToast(title, message, variant) {
        const event = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(event);
    }

    get showContent() {
        return !this.isLoading && !this.hasError && this.coreStrategies.length > 0;
    }

    get showSpinner() {
        return this.isLoading;
    }

    generateUniqueId() {
    return 'id-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

getFilteredPersonnelData() {
    const filteredData = {};
    this.selectedAbatementStrategies.forEach(key => {
        if (this.personnelData[key] && this.personnelData[key].length > 0) {
            filteredData[key] = this.personnelData[key];
        }
    });
    return filteredData;
}

getFilteredBudgetData() {
    const filteredData = {};
    this.selectedAbatementStrategies.forEach(key => {
        if (this.budgetData[key] && this.budgetData[key].length > 0) {
            filteredData[key] = this.budgetData[key];
        }
    });
    return filteredData;
}

// Additional helper method to get personnel records for template
getPersonnelRecords(abatementValue) {
    return this.personnelData[abatementValue] || [];
}

// Additional helper method to get budget records for template
getBudgetRecords(abatementValue) {
    return this.budgetData[abatementValue] || [];
}

    // Getter to return the correct strategy line resource data for a given abatement option
    getStrategyLineResourceData(strategyValue) {
        return this._strategyLineResourcesData && this._strategyLineResourcesData[strategyValue]
            ? this._strategyLineResourcesData[strategyValue]
            : {};
    }

    // Update abatementOptionDataMap whenever strategyLineResourcesData or processedCoreStrategies changes
    renderedCallback() {
        const map = {};
        this.processedCoreStrategies.forEach(strategy => {
            (strategy.abatementOptions || []).forEach(option => {
                map[option.value] = this._strategyLineResourcesData && this._strategyLineResourcesData[option.value]
                    ? this._strategyLineResourcesData[option.value]
                    : {};
            });
        });
        this.abatementOptionDataMap = map;

        
    }

    // Add this public method to reset expanded state
    @api
    resetExpandedStrategies() {
        this.expandedStrategies = new Set();
    }

    @api
    clearData() {
        console.log('=== clearData called on abatementStrategies component ===');
        // Clear all internal state
        this.selectedCoreStrategies = [];
        this.selectedAbatementStrategies = [];
        this.expandedStrategies = new Set();
        this._strategyLineResourcesData = {};
        this.personnelData = {};
        this.budgetData = {};
        this.existingRecordId = null; // Reset the record ID
        this.componentData = {
            coreStrategies: [],
            abatementStrategies: []
        };
        this.abatementOptionDataMap = {};
        
        // Force reactivity
        this.strategyLineResourcesData = { ...this.strategyLineResourcesData };
        this.personnelData = { ...this.personnelData };
        this.budgetData = { ...this.budgetData };
        
        console.log('abatementStrategies component cleared successfully');
    }

    @api
    handleAddPartnerFromParent() {
        console.log('=== handleAddPartnerFromParent METHOD CALLED ===');
        // Log all tracked, api, and internal variables
        console.log('Add Partner Clicked - Logging all variables:');
        console.log('applicationData:', JSON.stringify(this.applicationData));
        console.log('picklistValues:', JSON.stringify(this.picklistValues));
        console.log('recordId:', this.recordId);
        console.log('strategyLineResourcesData:', JSON.stringify(this._strategyLineResourcesData));
        console.log('coreStrategies:', JSON.stringify(this.coreStrategies));
        console.log('mappedAbatementStrategies:', JSON.stringify(this.mappedAbatementStrategies));
        console.log('selectedCoreStrategies:', JSON.stringify(this.selectedCoreStrategies));
        console.log('selectedAbatementStrategies:', JSON.stringify(this.selectedAbatementStrategies));
        console.log('expandedStrategies:', JSON.stringify(Array.from(this.expandedStrategies)));
        console.log('isLoading:', this.isLoading);
        console.log('hasError:', this.hasError);
        console.log('errorMessage:', this.errorMessage);
        console.log('componentData:', JSON.stringify(this.componentData));
        console.log('abatementOptionDataMap:', JSON.stringify(this.abatementOptionDataMap));
        console.log('personnelData:', JSON.stringify(this.personnelData));
        console.log('budgetData:', JSON.stringify(this.budgetData));
        console.log('personnelRows:', JSON.stringify(this.personnelRows));
        // If you want to log more, add here
    }

    @api
    updateStrategyLineResourcesIds(strategyToIdMap) {
        if (strategyToIdMap && typeof strategyToIdMap === 'object') {
            Object.keys(strategyToIdMap).forEach(strategyValue => {
                const recordId = strategyToIdMap[strategyValue];
                if (this._strategyLineResourcesData[strategyValue]) {
                    this._strategyLineResourcesData[strategyValue].Id = recordId;
                }
            });
            
            // Force reactivity
            this._strategyLineResourcesData = { ...this._strategyLineResourcesData };
            
            console.log('Updated strategy line resources with IDs:', strategyToIdMap);
        }
    }
}