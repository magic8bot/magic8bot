// Chaikin Money Flow
export class CMF {
  public static calculate(periods: Record<string, number>[], length: number) {
    if (periods.length >= length) {
      let moneyFlowVolume = 0
      let sumOfVolume = 0
    
      periods.slice(0,length).forEach((curr) => {
        moneyFlowVolume += (curr.volume * (curr.close - curr.low - (curr.high - curr.close))) / (curr.high - curr.low)
        sumOfVolume += curr.volume
      })
      return moneyFlowVolume / sumOfVolume
    }
  }
}
/*
Steps to calculating Chaikin Money Flow (CMF). 
The example below is based on 20-periods.
First, calculate the Money Flow Multiplier for each period. 
Second, multiply this value by the period's volume to find Money Flow Volume. 
Third, sum Money Flow Volume for the 20 periods and 
divide by the 20-period sum of volume.

               
1. Money Flow Multiplier = [(Close  -  Low) - (High - Close)] /(High - Low) 

2. Money Flow Volume = Money Flow Multiplier x Volume for the Period

3. 20-period CMF = 20-period Sum of Money Flow Volume / 20 period Sum of Volume
