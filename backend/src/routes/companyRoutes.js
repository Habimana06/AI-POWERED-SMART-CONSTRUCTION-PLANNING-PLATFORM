const express = require('express');
const companyController = require('../controllers/companyController');
const { authenticate, authorize } = require('../middleware/auth');
const auditLog = require('../middleware/auditLog');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', companyController.getCompanies);
router.get('/:id', companyController.getCompanyById);
router.post('/', auditLog('CREATE_COMPANY', 'company'), companyController.createCompany);
router.put('/:id', auditLog('UPDATE_COMPANY', 'company'), companyController.updateCompany);
router.delete('/:id', auditLog('DELETE_COMPANY', 'company'), companyController.deleteCompany);

module.exports = router;
