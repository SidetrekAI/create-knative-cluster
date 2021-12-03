type SimpleStoreObj = {
  [key: string]: any
}

export class SimpleStore {
  store: SimpleStoreObj

  constructor() {
    this.store = {}
  }

  setDefaultStates(defaultStates: any) {
    this.store = defaultStates
  }

  setState(stateName: string, stateValue: any) {
    this.store[stateName] = stateValue
  }

  getState(stateName: string) {
    return this.store[stateName]
  }
}

const simpleStore = new SimpleStore()

simpleStore.setDefaultStates({
  cliExecutionContext: 'pulumi',
  currentStack: '',
  cliOptions: {},
  globalPulumiConfigs: [],
})

// Stack reference store

type StackReferenceStoreObj = {
  [key: string]: any
}

export class StackReferenceStore {
  store: StackReferenceStoreObj

  constructor() {
    this.store = {}
  }

  setState(stackName: string, stackReferenceInstance: any) {
    this.store[stackName] = stackReferenceInstance
  }

  getState(stackName: string) {
    return this.store[stackName]
  }
}

const stackReferenceStore = new StackReferenceStore()

export { simpleStore, stackReferenceStore }