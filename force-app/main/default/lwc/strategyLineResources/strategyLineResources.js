import { LightningElement, api, track } from 'lwc';

export default class StrategyLineResources extends LightningElement {
    // Public properties to receive data from parent
    @api strategyValue;
    @api picklistValues = {};
    @api existingData = {};

    // Track form data for this strategy
    @track formData = {
        BudgetAmountForThePurchase__c: '',
        IsYourStrategyInitialContinuation__c: '',
        BudgetNarrative__c: '',
        ImplementationPlanForTheStrategy__c: '',
        ProvideTheOutcomeMeasures__c: '',
        ProvideTheProcessMeasures__c: '',
        Strategy_Value__c: ''
    };

    @track isInitialized = false;

    // Lifecycle hook
    connectedCallback() {
        console.log('StrategyLineResources connected for strategy:', this.strategyValue);
        this.initializeFormData();
    }

    // Initialize form data when component loads
    initializeFormData() {
        try {
            // Set strategy value
            this.formData.Strategy_Value__c = this.strategyValue;
            
            // Load existing data if available
            if (this.existingData && Object.keys(this.existingData).length > 0) {
                this.formData = {
                    ...this.formData,
                    ...this.existingData
                };
                console.log('Loaded existing data for strategy:', this.strategyValue, this.formData);
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing form data:', error);
        }
    }

    // Handle input changes
    handleInputChange(event) {
        try {
            const field = event.target.dataset.field || event.target.name;
            const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
            
            console.log('Field changed:', field, 'Value:', value, 'Strategy:', this.strategyValue);
            
            // Update form data
            this.formData = {
                ...this.formData,
                [field]: value
            };
            
            // Dispatch change event to parent with bubbles and composed
            this.dispatchStrategyLineDataChange();
            
        } catch (error) {
            console.error('Error handling input change:', error);
        }
    }

    // Dispatch data change event to grandparent
    dispatchStrategyLineDataChange() {
        try {
            const strategyLineData = {
                strategyValue: this.strategyValue,
                data: { ...this.formData }
            };
            
            console.log('Dispatching strategy line data change:', strategyLineData);
            
            // Create custom event with bubbles and composed set to true
            const dataChangeEvent = new CustomEvent('strategylineresourceschange', {
                detail: strategyLineData,
                bubbles: true,
                composed: true
            });
            
            this.dispatchEvent(dataChangeEvent);
        } catch (error) {
            console.error('Error dispatching strategy line data change:', error);
        }
    }

    // Public method to get current data
    @api
    getData() {
        return {
            strategyValue: this.strategyValue,
            data: { ...this.formData }
        };
    }

    // Public method to set data
    @api
    setData(data) {
        if (data && data[this.strategyValue]) {
            this.formData = {
                ...this.formData,
                ...data[this.strategyValue]
            };
        }
    }

    // Public method to validate form
    @api
    validateForm() {
        try {
            const inputs = this.template.querySelectorAll('lightning-input, lightning-combobox, lightning-textarea');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.reportValidity();
                    isValid = false;
                }
            });
            
            return isValid;
        } catch (error) {
            console.error('Error validating form:', error);
            return false;
        }
    }

    // Get picklist options for Initial/Continuation
    get initialContinuationOptions() {
        try {
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
        } catch (error) {
            console.error('Error getting picklist options:', error);
            return [
                { label: 'Initial', value: 'Initial' },
                { label: 'Continuation', value: 'Continuation' }
            ];
        }
    }

    // Clear form data
    @api
    clearData() {
        this.formData = {
            BudgetAmountForThePurchase__c: '',
            IsYourStrategyInitialContinuation__c: '',
            BudgetNarrative__c: '',
            ImplementationPlanForTheStrategy__c: '',
            ProvideTheOutcomeMeasures__c: '',
            ProvideTheProcessMeasures__c: '',
            Strategy_Value__c: this.strategyValue
        };
        this.dispatchStrategyLineDataChange();
    }

    // Computed properties for form values
    get budgetAmount() {
        return this.formData.BudgetAmountForThePurchase__c || '';
    }

    get initialContinuation() {
        return this.formData.IsYourStrategyInitialContinuation__c || '';
    }

    get budgetNarrative() {
        return this.formData.BudgetNarrative__c || '';
    }

    get implementationPlan() {
        return this.formData.ImplementationPlanForTheStrategy__c || '';
    }

    get outcomeMeasures() {
        return this.formData.ProvideTheOutcomeMeasures__c || '';
    }

    get processMeasures() {
        return this.formData.ProvideTheProcessMeasures__c || '';
    }
}