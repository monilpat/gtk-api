import { add, format } from 'date-fns'

const calculateExpirationDate = (date: Date) => {
  const futureDate = add(date, { months: 3 })
  const formattedDate = format(futureDate, 'yyyy/MM/dd')
  return formattedDate
}

export default calculateExpirationDate
