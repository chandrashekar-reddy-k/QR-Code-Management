import express from "express"

import {

 onboardingDeliveryAgent,
 getDeliveryAgents,
 getDeliveryAgentById,
 updateDeliveryAgent,
 updateDeliveryAgentApprovalStatus,
 toggleDeliveryAgent,
 deleteDeliveryAgent,
 bulkDeleteDeliveryAgents,
 checkPhoneExists

} from "../controllers/deliveryAgentController.js"
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requirePartner } from "../middlewares/partnerMiddleware.js";

import {

 onboardingValidation,
 getAgentsValidation,
 getAgentByIdValidation,
 updateAgentValidation,
 toggleAgentValidation

} from "../validations/deliverAgentValidations.js"

const router = express.Router()

router.use(authMiddleware, requirePartner);

router.get("/check-phone", checkPhoneExists);
router.post("/check-phone", checkPhoneExists);

router.post(
 "/onboarding",
 onboardingValidation,
 onboardingDeliveryAgent
)

router.get(
 "/getall",
 getAgentsValidation,
 getDeliveryAgents
)

router.get(
 "/get/:id",
 getAgentByIdValidation,
 getDeliveryAgentById
)

router.put(
 "/update/:id",
 updateAgentValidation,
 updateDeliveryAgent
)

router.put(
 "/update-status/:id",
 updateDeliveryAgentApprovalStatus
)

router.post(
 "/update-status/:id",
 updateDeliveryAgentApprovalStatus
)

router.delete(
 "/toggle/:id",
 toggleAgentValidation,
 toggleDeliveryAgent
)

router.delete(
 "/delete/:id",
 deleteDeliveryAgent
)

router.post(
 "/bulk-delete",
 bulkDeleteDeliveryAgents
)

export default router