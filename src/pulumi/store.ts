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

export { simpleStore }