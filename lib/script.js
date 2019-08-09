/**
 * Cria os lances de acordo com o Leilão especifico
 * @param {org.acme.model.Lance} lance - Transação como o Lance que será adicionado ao Leilão
 * @transaction
 */
function criarLance(lance) {
    var leilao = lance.leilao;
    if (leilao.estadoLeilao !== 'ABERTO') {
      throw new Error('Leilão não está a aberto');
    }
    
    if (lance.comprador.saldo < lance.valor) {
      throw new Error('Comprador não possui saldo suficiente');
    }
    
    if (lance.comprador.membroId === leilao.produto.proprietario.membroId) {
      throw new Error('O proprietário não pode criar um lance!');
    }
    
    if (leilao.lances == null) {
      leilao.lances = [];
    }
    
    leilao.lances.push(lance);
    
    return getAssetRegistry('org.acme.model.Leilao')
      .then(function(leilaoRegistry) {
      return leilaoRegistry.update(leilao);
    });
  }
  
  /**
   * Finaliza o Leilão, realizando as operações de transferir os Assest para os
   * devidos participantes
   * @param {org.acme.model.FinalizarLeilao} _leilao - Transação com o Leilão que será finalizado.
   * @transaction
   */
  function finalizarLeilao(_leilao) {
      var leilao = _leilao.leilao;
        if (leilao.estadoLeilao !== 'ABERTO') {
          throw new Error('Leilão já foi encerrado!');
      }
      var produto = leilao.produto;
      var proprietario = produto.proprietario;
        
        var maiorLance = leilao.lances[0];
        
      for(var i = 1; i < leilao.lances.length; i++){
        var valorLance = leilao.lances[i];
        if(maiorLance.valor < valorLance.valor){
          maiorLance = valorLance;
        }
      }
    
        if (leilao.valorInicial >= maiorLance) {
         return getAssetRegistry('org.acme.model.Leilao')
           .then(function (leilaoRegistry) {
           //Atualiza o estado do Leilão
           leilao.estadoLeilao = 'FECHADO';
           return leilaoRegistry.update(leilao);
         });
      } else {
        
        var comprador = maiorLance.comprador;
  
        return getParticipantRegistry('org.acme.model.Membro')
          .then(function (compradorRegistry) {
          
                //Atualiza saldo do comprador debitando o valor do lance
              comprador.saldo -= maiorLance.valor;
              compradorRegistry.update(comprador);
          
              return getParticipantRegistry('org.acme.model.Membro')
                .then(function (proprietarioRegistry) {
                
                        //Atualiza saldo do proprietario creditando o valor do lance
                        proprietario.saldo += maiorLance.valor;
                        proprietarioRegistry.update(proprietario);
                
                        return getAssetRegistry('org.acme.model.Produto')
                        .then(function (produtoRegistry) {
                        
                              //Atualiza o proprietario do objeto
                              produto.proprietario = comprador;
                              //Atualiza o valor do obejto com o valor do lance
                              produto.valor = maiorLance.valor;
                            produtoRegistry.update(produto);
                        
                            return getAssetRegistry('org.acme.model.Leilao')
                                .then(function (leilaoRegistry) {
                              
                                //Atualiza o estado do Leilão
                                leilao.estadoLeilao = 'FECHADO';
                                //Atualiza o valor final do Leilão
                                leilao.valorFinal = maiorLance.valor;
                                return leilaoRegistry.update(leilao);
                            });
                        });
                });
          });
      }
  }