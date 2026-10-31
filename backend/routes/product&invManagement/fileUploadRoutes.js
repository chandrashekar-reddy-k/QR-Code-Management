import express from 'express'

//import Controller
import {
    uploadFile, getPresignedFile
} from '../../controllers/product&invManagement/filemanagementController.js'


const fileManagementRouter = express.Router()

// fileUpload Routes
fileManagementRouter.post('/uploadFile', uploadFile)
fileManagementRouter.post('/getPresignedFile', getPresignedFile)

export default fileManagementRouter