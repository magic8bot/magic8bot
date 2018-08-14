import { observable, action, computed } from 'mobx'

export class ErrorStore {
  @observable
  private _errors: string[] = []

  @computed
  public get errors(): string[] {
    return this._errors.slice(0, 25)
  }

  @action
  public addError(error: string) {
    this._errors.push(error)
  }
}

export const errorStore = new ErrorStore()
