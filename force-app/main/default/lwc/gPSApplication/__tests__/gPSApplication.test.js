import { createElement } from '@lwc/engine-dom';
import GPSApplication from 'c/gPSApplication';

describe('c-gps-application', () => {
    afterEach(() => {
        // The jsdom instance is shared across test cases in a single file so reset the DOM
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('should initialize with isDataAdded flag as false', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });

        // Act
        document.body.appendChild(element);

        // Assert
        expect(element.isDataAdded).toBe(false);
    });

    it('should set isDataAdded flag to true when partner is added', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act - simulate adding a partner
        element.partners = [{
            partnerIndex: 0,
            technicalProposal: { PartnerName__c: 'Test Partner' },
            abatementStrategies: {},
            strategyLineResources: {},
            abatementExtra: {}
        }];
        element.isDataAdded = true;

        // Assert
        expect(element.isDataAdded).toBe(true);
        expect(element.partners.length).toBe(1);
    });

    it('should reset isDataAdded flag when all partners are deleted', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act - simulate having partners and then deleting them
        element.partners = [{
            partnerIndex: 0,
            technicalProposal: { PartnerName__c: 'Test Partner' },
            abatementStrategies: {},
            strategyLineResources: {},
            abatementExtra: {}
        }];
        element.isDataAdded = true;
        
        // Simulate deleting all partners
        element.partners = [];
        element.isDataAdded = false;

        // Assert
        expect(element.isDataAdded).toBe(false);
        expect(element.partners.length).toBe(0);
    });

    it('should disable Next button when isDataAdded is true in step 3', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.currentStep = 3;
        element.isDataAdded = true;

        // Assert
        expect(element.isNextButtonDisabled).toBe(true);
    });

    it('should disable Add Partner button when isDataAdded is true', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.isDataAdded = true;

        // Assert
        expect(element.isAddPartnerButtonDisabled).toBe(true);
    });

    it('should disable Previous button when isDataAdded is true in step 3', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.currentStep = 3;
        element.isDataAdded = true;

        // Assert
        expect(element.isPreviousButtonDisabled).toBe(true);
    });

    it('should show correct partners status when no partners are added', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.partners = [];
        element.isDataAdded = false;

        // Assert
        expect(element.partnersStatus).toBe('No partners added');
        expect(element.partnersStatusClass).toBe('slds-text-color_weak');
    });

    it('should show correct partners status when partners are added and flag is set', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.partners = [{
            partnerIndex: 0,
            technicalProposal: { PartnerName__c: 'Test Partner' },
            abatementStrategies: {},
            strategyLineResources: {},
            abatementExtra: {}
        }];
        element.isDataAdded = true;

        // Assert
        expect(element.partnersStatus).toBe('1 partner(s) added - Adding more partners is disabled');
        expect(element.partnersStatusClass).toBe('slds-text-color_error');
    });

    it('should show correct partners status when partners are added but flag is not set', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.partners = [{
            partnerIndex: 0,
            technicalProposal: { PartnerName__c: 'Test Partner' },
            abatementStrategies: {},
            strategyLineResources: {},
            abatementExtra: {}
        }];
        element.isDataAdded = false;

        // Assert
        expect(element.partnersStatus).toBe('1 partner(s) added - You can add more partners');
        expect(element.partnersStatusClass).toBe('slds-text-color_success');
    });

    it('should reset isDataAdded flag when handleResetPartnersFlag is called', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.isDataAdded = true;
        element.handleResetPartnersFlag();

        // Assert
        expect(element.isDataAdded).toBe(false);
    });

    it('should clear all partners and reset flag when handleClearAllPartners is called', () => {
        // Arrange
        const element = createElement('c-gps-application', {
            is: GPSApplication
        });
        document.body.appendChild(element);

        // Act
        element.partners = [{
            partnerIndex: 0,
            technicalProposal: { PartnerName__c: 'Test Partner' },
            abatementStrategies: {},
            strategyLineResources: {},
            abatementExtra: {}
        }];
        element.currentPartnerIndex = 1;
        element.isDataAdded = true;
        
        // Mock confirm to return true
        const originalConfirm = window.confirm;
        window.confirm = jest.fn(() => true);
        
        element.handleClearAllPartners();

        // Assert
        expect(element.partners.length).toBe(0);
        expect(element.currentPartnerIndex).toBe(0);
        expect(element.isDataAdded).toBe(false);
        
        // Restore original confirm
        window.confirm = originalConfirm;
    });
});