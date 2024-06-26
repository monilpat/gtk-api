import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { SigningStargateClient, SequenceResponse } from '@cosmjs/stargate'
import { WalletKeeper } from './WalletKeeper'

// skip initialize wallets
WalletKeeper.prototype.initializeWallets = () => Promise.resolve()

// SigningStargateClient.prototype.getSequence = (address: string) =>
//   Promise.resolve<SequenceResponse>({
//     accountNumber: 2,
//     sequence: 1,
//   })

// mock jose module
jest.mock('jose', () => jest.fn())

// mock common
jest.mock('../common', () => ({
  getEnv: jest.fn().mockResolvedValue({ kind: 'local' }),
}))

// mock server utils
jest.mock('./serverUtils', () => ({
  getEnvConfig: jest.fn().mockResolvedValue({
    sifRpcUrl: 'http://localhost:1317',
  }),
}))

describe('WalletKeeper', () => {
  let walletKeeper: WalletKeeper

  beforeEach(async () => {
    walletKeeper = await WalletKeeper.build()
  })

  describe('getClient', () => {
    it('should return the client object for the specified wallet', async () => {
      const client = expect.any(SigningStargateClient)
      walletKeeper.wallets = {
        mv: {
          wallet: {} as DirectSecp256k1HdWallet,
          account: { address: 'address1' } as any,
          client,
        },
        pta: {
          wallet: {} as DirectSecp256k1HdWallet,
          account: { address: 'address2' } as any,
          client: expect.any(SigningStargateClient),
        },
      }

      const result = await walletKeeper.getClient('mv')

      // Verify that the correct client object has been returned
      expect(result).toEqual(client)
    })

    it('should throw an error if the specified wallet is not found', async () => {
      await expect(walletKeeper.getClient('dummy' as any)).rejects.toThrow(
        'Failed to re-initialize wallet with id dummy'
      )
    })
  })
})
