import protobuf from 'protobufjs'

export function createRoot() {
  return protobuf.Root.fromJSON({
    nested: {
      cosmos: {
        nested: {
          tx: {
            nested: {
              v1beta1: {
                nested: {
                  Tx: {
                    fields: {
                      body: {
                        type: 'TxBody',
                        id: 1,
                      },
                    },
                  },
                  TxBody: {
                    fields: {
                      memo: {
                        type: 'string',
                        id: 2,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
}
