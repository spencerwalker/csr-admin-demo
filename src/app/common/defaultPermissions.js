angular.module('orderCloud.defaultPermissions', [])
    .factory('AvedaDefaultPermissionsService', AvedaDefaultPermissionsService)
;

function AvedaDefaultPermissionsService()  {
    var service = {
        AllPermissions: _allPermissions,
        CSR: _csr,
        RegionVP: _regionVP,
        POD: _pod,
        SDP: _sdp,
        Custom: _custom,
        SalonAdmin: _salonAdmin,
        SalonStylist: _salonStylist,
        PermissionMap: _permissionMap
    };

    function _allPermissions() {
        return [
            'Permissions-Order-Basic',
            'Permissions-Order-ClientDislike',
            'Permissions-Order-Launch',
            'Permissions-Order-Replenishment',
            'Permissions-Order-CostCenter',
            'Permissions-Order-CustomizedMarketing',
            'Permissions-Order-MultipleOneFreight',
            'Permissions-Order-Holiday',
            'Permissions-Order-CreditMemo',
            'Permissions-Order-DebitMemo',
            'Permissions-Order-Return',
            'Permissions-Order-NonProduct',
            'Permissions-Ability-SaveCreditCardPersonal',
            'Permissions-Ability-ManageUsersBuyer',
            'Permissions-Ability-ManageSaveCardSalon',
            'Permissions-Ability-ViewAllOrderAtLocation',
            'Permissions-Ability-SendNotificationToOthers',
            'Permissions-Ability-ReportingAccess',
            'Permissions-Ability-AllowSalonOwnerUserDesignation',
            'Permissions-Ability-SetDefaultShipping'
        ];
    }

    function _csr() {
        return {
            AssignedByDefault: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Replenishment',
                'Permissions-Order-CostCenter',
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Order-MultipleOneFreight',
                'Permissions-Order-Holiday',
                'Permissions-Order-CreditMemo',
                'Permissions-Order-DebitMemo',
                'Permissions-Order-Return',
                'Permissions-Order-NonProduct',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Ability-ReportingAccess'
            ],
            CanAssign: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Replenishment',
                'Permissions-Order-CostCenter',
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Order-MultipleOneFreight',
                'Permissions-Order-Holiday',
                'Permissions-Order-CreditMemo',
                'Permissions-Order-DebitMemo',
                'Permissions-Order-Return',
                'Permissions-Order-NonProduct',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Ability-ReportingAccess',
                'Permissions-Ability-AllowSalonOwnerUserDesignation',
                'Permissions-Ability-SetDefaultShipping'
            ]
        };
    }

    function _regionVP() {
        return {
            AssignedByDefault: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Replenishment',
                'Permissions-Order-CostCenter',
                'Permissions-Order-Holiday',
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Ability-ReportingAccess'
            ],
            CanAssign: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Holiday',
                'Permissions-Order-Replenishment',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation'
            ]
        };
    }

    function _pod() {
        return {
            AssignedByDefault: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Replenishment',
                'Permissions-Order-Holiday',
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Order-CostCenter',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Ability-ReportingAccess'
            ],
            CanAssign: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Holiday',
                'Permissions-Order-Replenishment',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation'
            ]
        };
    }

    function _sdp() {
        return {
            AssignedByDefault: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Replenishment',
                'Permissions-Order-CostCenter',
                'Permissions-Order-Holiday',
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Ability-ReportingAccess'
            ],
            CanAssign: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Order-Launch',
                'Permissions-Order-Replenishment',
                'Permissions-Order-Holiday',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation'
            ]
        };
    }

    function _custom() {
        return {
            AssignedByDefault: [
                'Permissions-Order-CostCenter',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Ability-ReportingAccess'
            ],
            CanAssign: [
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation'
            ]
        };
    }

    function _salonAdmin() {
        return {
            AssignedByDefault: [
                'Permissions-Order-Basic',
                'Permissions-Order-ClientDislike',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-ViewAllOrderAtLocation'
            ],
            CanAssign: [
                'Permissions-Order-Basic',
                'Permissions-Ability-SaveCreditCardPersonal',
                'Permissions-Ability-ManageUsersBuyer',
                'Permissions-Ability-ManageSaveCardSalon',
                'Permissions-Ability-SendNotificationToOthers',
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Ability-ViewAllOrderAtLocation'
            ]
        };
    }

    function _salonStylist() {
        return {
            AssignedByDefault: [
                'Permissions-Order-Basic',
                'Permissions-Ability-SaveCreditCardPersonal'
            ],
            CanAssign: [
                'Permissions-Order-CustomizedMarketing',
                'Permissions-Ability-SendNotificationToOthers'
            ]
        };
    }

    function _permissionMap() {
        return {
            'Permissions-Order-Basic': 'Place Basic Order',
            'Permissions-Order-ClientDislike': 'Create a Client Dislike',
            'Permissions-Order-Launch': 'Place a Launch Order',
            'Permissions-Order-Replenishment': 'Place a Replenishment Order',
            'Permissions-Order-CostCenter': 'Place a Cost Center Order',
            'Permissions-Order-CustomizedMarketing': 'Place a Customized Marketing Order',
            'Permissions-Order-MultipleOneFreight': 'Place a Multiple Order, One Freight Order',
            'Permissions-Order-Holiday': 'Place a Holiday Order',
            'Permissions-Order-CreditMemo': 'Create a Credit Memo',
            'Permissions-Order-DebitMemo': 'Create a Debit Memo',
            'Permissions-Order-Return': 'Place a Return Order',
            'Permissions-Order-NonProduct': 'Place a Non Product Order',
            'Permissions-Ability-SaveCreditCardPersonal': 'Save Personal Credit Cards',
            'Permissions-Ability-ManageUsersBuyer': 'Manage Users',
            'Permissions-Ability-ManageSaveCardSalon': 'Manage Salon Credit Cards',
            'Permissions-Ability-ViewAllOrderAtLocation': 'View All Orders for Location',
            'Permissions-Ability-SendNotificationToOthers': 'Send Order Notification to Others',
            'Permissions-Ability-ReportingAccess': 'Reporting Access',
            'Permissions-Ability-AllowSalonOwnerUserDesignation': 'Allow Salon Owner User Designation',
            'Permissions-Ability-SetDefaultShipping' : 'Set Default Shipping Address'
        };
    }

    return service;
}