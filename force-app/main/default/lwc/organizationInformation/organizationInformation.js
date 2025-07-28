// Fixed Child Component Implementation
// This should be applied to all child components (organizationInformation, technicalProposal, etc.)

import { LightningElement, api, track } from 'lwc';

export default class OrganizationInformation extends LightningElement {
    @api recordId;
    @api picklistValues = {};
    @track formData = {};
    @track isInitialized = false;
    @track showCountyField = false; // Add this line

    // Private property to store the received application data
    _applicationData = {};

    // API method to receive data from parent
    @api
    setData(data) {
        console.log('Child component received data:', data);
        if (data) {
            this._applicationData = { ...data };
            this.formData = { ...data };
            this.isInitialized = true;
            
            // Update form fields after data is set
            this.updateFormFields();
        }
    }

    // API method to return current form data to parent
    @api
    getData() {
        console.log('Child component returning data:', this.formData);
        this.collectFormData();
        return this.formData;
    }

    // API method for validation
    @api
    validateStep() {
        console.log('Validating step...');
        this.collectFormData();
        const isValid = this.validateFormFields();
        if (!isValid) {
            this.showValidationErrors();
        }
        return isValid;
    }

    // Handle input changes
    handleInputChange(event) {
        try {
            const fieldName = event.target.name || event.target.dataset.field;
            const value = event.target.value;
            
            console.log('Input changed:', fieldName, value);
            
            if (fieldName) {
                this.formData[fieldName] = value;
                
                // Handle special cases (like showing/hiding fields)
                this.handleSpecialFieldLogic(fieldName, value);
                
                // Notify parent of data change
                this.notifyParent();
            }
        } catch (error) {
            console.error('Error handling input change:', error);
        }
    }

    // Handle special field logic (like conditional field display)
    handleSpecialFieldLogic(fieldName, value) {
        // Example: Show "Other" field when "Other" is selected
        if (fieldName === 'EntityType__c') {
            // Update reactive property for template
            this.updateReactiveProperties();
        }
        // Show county field only if CollaboratingWithOtherGPSEntity__c is 'Yes'
        if (fieldName === 'CollaboratingWithOtherGPSEntity__c') {
            this.showCountyField = (value === 'Yes');
        }
    }

    // Update reactive properties for template rendering
    updateReactiveProperties() {
        // This can be overridden in each child component for specific logic
        // Also update showCountyField in case data is set from parent
        this.showCountyField = (this.formData.CollaboratingWithOtherGPSEntity__c === 'Yes');
    }

    // Handle file upload
    handleUploadFinished(event) {
        try {
            const uploadedFiles = event.detail.files;
            console.log('Files uploaded:', uploadedFiles);
            
            // Update form data with uploaded files
            this.formData.uploadedFiles = uploadedFiles;
            this.notifyParent();
        } catch (error) {
            console.error('Error handling file upload:', error);
        }
    }

    // Handle file deletion
    handleDelete(event) {
        try {
            const fileId = event.target.dataset.id;
            console.log('Deleting file:', fileId);
            
            // Remove file from uploaded files list
            if (this.formData.uploadedFiles) {
                this.formData.uploadedFiles = this.formData.uploadedFiles.filter(
                    file => file.id !== fileId
                );
                this.notifyParent();
            }
        } catch (error) {
            console.error('Error deleting file:', error);
        }
    }

    // Collect form data from DOM elements
    collectFormData() {
        try {
            const inputs = this.template.querySelectorAll(
                'lightning-input, lightning-combobox, lightning-textarea, lightning-checkbox, lightning-radio-group'
            );
            
            inputs.forEach(input => {
                const fieldName = input.name || input.dataset.field;
                if (fieldName && input.value !== undefined) {
                    this.formData[fieldName] = input.value;
                }
            });
            
            console.log('Form data collected:', this.formData);
        } catch (error) {
            console.error('Error collecting form data:', error);
        }
    }

    // Update form fields with data
    updateFormFields() {
        if (!this.isInitialized || !this.formData) return;
        
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            try {
                const inputs = this.template.querySelectorAll(
                    'lightning-input, lightning-combobox, lightning-textarea, lightning-checkbox, lightning-radio-group'
                );
                
                inputs.forEach(input => {
                    const fieldName = input.name || input.dataset.field;
                    if (fieldName && this.formData[fieldName] !== undefined) {
                        input.value = this.formData[fieldName];
                    }
                });
                
                console.log('Form fields updated with data');
            } catch (error) {
                console.error('Error updating form fields:', error);
            }
        }, 100);
    }

    // Validate form fields
    validateFormFields() {
        try {
            let isValid = true;
            const inputs = this.template.querySelectorAll(
                'lightning-input, lightning-combobox, lightning-textarea'
            );
            
            inputs.forEach(input => {
                if (input.required && (!input.value || input.value.trim() === '')) {
                    isValid = false;
                    console.log('Required field is empty:', input.name || input.dataset.field);
                }
                
                if (!input.checkValidity()) {
                    isValid = false;
                    console.log('Field validation failed:', input.name || input.dataset.field);
                }
            });
            
            return isValid;
        } catch (error) {
            console.error('Error validating form fields:', error);
            return false;
        }
    }

    // Show validation errors
    showValidationErrors() {
        try {
            const inputs = this.template.querySelectorAll(
                'lightning-input, lightning-combobox, lightning-textarea'
            );
            
            inputs.forEach(input => {
                if (!input.checkValidity()) {
                    input.reportValidity();
                }
            });
        } catch (error) {
            console.error('Error showing validation errors:', error);
        }
    }

    // Notify parent component of data changes
    // Modify the notifyParent method
notifyParent() {
    try {
        const dataChangeEvent = new CustomEvent('datachange', {
            detail: {
                stepData: this.formData,
                stepType: 'organization'  // Add this line
            }
        });
        this.dispatchEvent(dataChangeEvent);
    } catch (error) {
        console.error('Error notifying parent:', error);
    }
}

    // Lifecycle hooks
    connectedCallback() {
        console.log('Child component connected');
        if (!this.formData || Object.keys(this.formData).length === 0) {
            this.formData = {};
        }
    }

    renderedCallback() {
        if (this.isInitialized && this.formData && Object.keys(this.formData).length > 0) {
            this.updateFormFields();
        }
    }

    // Getters for picklist options (these should be customized per component)
    get requestTypeOptions() {
        return this.picklistValues?.requestType || [];
    }

    get entityApproveOptions() {
        return this.picklistValues?.entityApprove || [];
    }

    get applicationStatusOptions() {
        return this.picklistValues?.applicationStatus || [];
    }

    get entityTypeOptions() {
        return this.picklistValues?.entityType || [];
    }

    get collaboratingOptions() {
        return this.picklistValues?.collaborating || [];
    }

    get countyOptions() {
        return this.picklistValues?.county || [];
    }

    get bellwetherOptions() {
        return this.picklistValues?.bellwether || [];
    }

    get litigatingOptions() {
        return this.picklistValues?.litigating || [];
    }

    get conflictOptions() {
        return this.picklistValues?.conflict || [];
    }

    get paymentStateOptions() {
        return this.picklistValues?.paymentState || [];
    }

    get stateOptions() {
        return this.picklistValues?.state || [];
    }

    // Getter for showing other entity type field
    get showOtherEntityType() {
        return this.formData?.entityType === 'Other';
    }

    // Getter for showing county field
    get showCountyFieldGetter() {
        return this.showCountyField;
    }

    // Getter for application data to be used in template
    get applicationData() {
        return this.formData;
    }

    // Getter for uploaded files
    get uploadedFiles() {
        return this.formData?.uploadedFiles || [];
    }
}