import 'zone.js'
import { bootstrapApplication } from '@angular/platform-browser'
import { DesignModeComponent } from './design-mode.component'

bootstrapApplication(DesignModeComponent).catch((error) => console.error(error))
