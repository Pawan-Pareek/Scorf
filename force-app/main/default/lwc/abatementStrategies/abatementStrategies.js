import { LightningElement, api, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Import Apex methods
import getCoreStrategiesPicklist from '@salesforce/apex/GPSApplicationController.getCoreStrategiesPicklist';
import getCoreAbatementStrategiesPicklist from '@salesforce/apex/GPSApplicationController.getCoreAbatementStrategiesPicklist';

export default class AbatementStrategies extends LightningElement {
    @api applicationData = {};
    @api picklistValues = {};
    @api recordId;

    @track coreStrategiesOptions = [];
    @track coreAbatementStrategiesOptions = [];
    @track availableAbatementStrategies = [];
    @track selectedCoreStrategies = [];
    @track selectedAbatementStrategies = [];
    @track expandedStrategies = new Set();
    @track strategySubItems = {};
    @track isLoading = true;
    @track hasError = false;
    @track errorMessage = '';

    // Strategy mapping - maps core strategies to their corresponding abatement strategies
    @track strategyMapping = {
        'A': 'A', // Core strategies starting with A map to abatement strategies starting with A
        'B': 'B',
        'C': 'C',
        'D': 'D',
        'E': 'E',
        'F': 'F',
        'G': 'G',
        'H': 'H'
    };

    connectedCallback() {
        console.log('Abatement Strategies Component Connected');
        this.loadPicklistData();
    }

    // Load picklist data from Apex
    loadPicklistData() {
        this.isLoading = true;
        
        Promise.all([
            getCoreStrategiesPicklist(),
            getCoreAbatementStrategiesPicklist()
        ])
        .then(([coreStrategies, coreAbatement]) => {
            console.log('Core Strategies loaded:', coreStrategies);
            console.log('Core Abatement Strategies loaded:', coreAbatement);
            
            this.coreStrategiesOptions = coreStrategies || [];
            this.coreAbatementStrategiesOptions = coreAbatement || [];
            
            // Initialize data if available
            if (this.applicationData) {
                this.initializeExistingData();
            }
            
            this.isLoading = false;
        })
        .catch(error => {
            console.error('Error loading picklist data:', error);
            this.handleError('Failed to load strategy options', error);
        });
    }

    // Initialize existing data from applicationData
    initializeExistingData() {
        try {
            if (this.applicationData.CoreStrategies__c) {
                this.selectedCoreStrategies = this.applicationData.CoreStrategies__c.split(';');
            }
            
            if (this.applicationData.Core_Abatement_Strategies__c) {
                this.selectedAbatementStrategies = this.applicationData.Core_Abatement_Strategies__c.split(';');
            }

            // Expand strategies that have selections
            this.selectedCoreStrategies.forEach(strategy => {
                const strategyValue = strategy.trim();
                if (strategyValue) {
                    this.expandedStrategies.add(strategyValue);
                    this.updateAvailableAbatementStrategies(strategyValue);
                }
            });

        } catch (error) {
            console.error('Error initializing existing data:', error);
        }
    }

    // Handle core strategy selection
    handleCoreStrategyChange(event) {
        try {
            const selectedValues = event.detail.value || [];
            console.log('Core strategies selected:', selectedValues);
            
            this.selectedCoreStrategies = selectedValues;
            
            // Update expanded strategies
            this.expandedStrategies.clear();
            selectedValues.forEach(strategy => {
                this.expandedStrategies.add(strategy);
                this.updateAvailableAbatementStrategies(strategy);
            });

            // Filter abatement strategies to only show relevant ones
            this.filterAbatementStrategies();
            
            // Notify parent component
            this.notifyParent();
            
        } catch (error) {
            console.error('Error handling core strategy change:', error);
            this.showToast('Error', 'Failed to update core strategies', 'error');
        }
    }

    // Handle abatement strategy selection
    handleAbatementStrategyChange(event) {
        try {
            const selectedValues = event.detail.value || [];
            console.log('Abatement strategies selected:', selectedValues);
            
            this.selectedAbatementStrategies = selectedValues;
            
            // Notify parent component
            this.notifyParent();
            
        } catch (error) {
            console.error('Error handling abatement strategy change:', error);
            this.showToast('Error', 'Failed to update abatement strategies', 'error');
        }
    }

    // Update available abatement strategies based on selected core strategy
    updateAvailableAbatementStrategies(coreStrategy) {
        try {
            if (!coreStrategy) return;
            
            // Get the first character of the core strategy to match with abatement strategies
            const firstChar = coreStrategy.charAt(0).toUpperCase();
            
            // Filter abatement strategies that start with the same character
            const matchingStrategies = this.coreAbatementStrategiesOptions.filter(strategy => 
                strategy.value.charAt(0).toUpperCase() === firstChar
            );
            
            console.log(`Matching strategies for ${coreStrategy}:`, matchingStrategies);
            
            // Store the mapping for this strategy
            this.strategySubItems[coreStrategy] = matchingStrategies;
            
        } catch (error) {
            console.error('Error updating available abatement strategies:', error);
        }
    }

    // Filter abatement strategies based on selected core strategies
    filterAbatementStrategies() {
        try {
            let filteredStrategies = [];
            
            this.selectedCoreStrategies.forEach(coreStrategy => {
                const firstChar = coreStrategy.charAt(0).toUpperCase();
                const matchingStrategies = this.coreAbatementStrategiesOptions.filter(strategy => 
                    strategy.value.charAt(0).toUpperCase() === firstChar
                );
                filteredStrategies = filteredStrategies.concat(matchingStrategies);
            });
            
            // Remove duplicates
            this.availableAbatementStrategies = filteredStrategies.filter((strategy, index, self) =>
                index === self.findIndex(s => s.value === strategy.value)
            );
            
            console.log('Filtered abatement strategies:', this.availableAbatementStrategies);
            
            // Remove selected abatement strategies that are no longer available
            this.selectedAbatementStrategies = this.selectedAbatementStrategies.filter(selected => 
                this.availableAbatementStrategies.some(available => available.value === selected)
            );
            
        } catch (error) {
            console.error('Error filtering abatement strategies:', error);
        }
    }

    // Toggle strategy expansion
    toggleStrategy(event) {
        try {
            const strategyValue = event.currentTarget.dataset.strategy;
            console.log('Toggling strategy:', strategyValue);
            
            if (this.expandedStrategies.has(strategyValue)) {
                this.expandedStrategies.delete(strategyValue);
            } else {
                this.expandedStrategies.add(strategyValue);
                this.updateAvailableAbatementStrategies(strategyValue);
            }
            
            // Force re-render
            this.expandedStrategies = new Set(this.expandedStrategies);
            
        } catch (error) {
            console.error('Error toggling strategy:', error);
        }
    }

    // Notify parent component of data changes
    notifyParent() {
        try {
            const stepData = {
                CoreStrategies__c: this.selectedCoreStrategies.join(';'),
                Core_Abatement_Strategies__c: this.selectedAbatementStrategies.join(';')
            };
            
            console.log('Notifying parent with abatement strategy data:', stepData);
            
            const dataChangeEvent = new CustomEvent('datachange', {
                detail: {
                    stepData: stepData,
                    stepType: 'abatementStrategy'
                }
            });
            
            this.dispatchEvent(dataChangeEvent);
            
        } catch (error) {
            console.error('Error notifying parent:', error);
        }
    }

    // Public method to validate the step
    @api
    validateStep() {
        try {
            // Add validation logic here
            if (this.selectedCoreStrategies.length === 0) {
                this.showToast('Validation Error', 'Please select at least one core strategy', 'error');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error validating step:', error);
            return false;
        }
    }

    // Public method to get current data
    @api
    getData() {
        return {
            CoreStrategies__c: this.selectedCoreStrategies.join(';'),
            Core_Abatement_Strategies__c: this.selectedAbatementStrategies.join(';')
        };
    }

    // Public method to set data
    @api
    setData(data) {
        try {
            if (data) {
                this.applicationData = { ...data };
                this.initializeExistingData();
            }
        } catch (error) {
            console.error('Error setting data:', error);
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
            console.error('Error showing toast:', error);
            console.log(`${title}: ${message}`);
        }
    }

    // Getters for template
    get coreStrategiesValue() {
        return this.selectedCoreStrategies;
    }

    get abatementStrategiesValue() {
        return this.selectedAbatementStrategies;
    }

    get showAbatementStrategies() {
        return this.availableAbatementStrategies.length > 0;
    }

    get expandedStrategiesList() {
        return this.selectedCoreStrategies.filter(strategy => 
            this.expandedStrategies.has(strategy)
        );
    }

    // Check if strategy is expanded
    isStrategyExpanded(strategyValue) {
        return this.expandedStrategies.has(strategyValue);
    }

    // Get sub-items for a strategy
    getStrategySubItems(strategyValue) {
        return this.strategySubItems[strategyValue] || [];
    }
}