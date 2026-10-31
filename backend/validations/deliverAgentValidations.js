import { body,param,query } from "express-validator"

export const onboardingValidation = [

 body("step")
 .notEmpty()
 .withMessage("step required")

]

export const getAgentsValidation = [

 query("warehouseId")
 .notEmpty()
 .withMessage("warehouseId required")

]

export const getAgentByIdValidation = [

 param("id")
 .notEmpty()
 .withMessage("Agent id required")

]

export const updateAgentValidation = [

 param("id")
 .notEmpty(),

 body("name").optional().isString(),

 body("phone").optional().isMobilePhone(),

 body("email").optional().isEmail()

]

export const toggleAgentValidation = [

 param("id")
 .notEmpty()
]